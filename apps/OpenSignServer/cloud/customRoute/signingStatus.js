import Parse from 'parse/node.js';
import { ensureParse } from './apiAuth.js';

function dateIso(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value.iso) {
    return value.iso;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

function collectSigners(document) {
  const placeholders = (document.Placeholders || []).filter(
    item => item?.Role !== 'prefill' && (item?.signerObjId || item?.email)
  );

  if (placeholders.length > 0) {
    return placeholders.map(placeholder => {
      const signer = (document.Signers || []).find(
        item => item.objectId === placeholder.signerObjId
      );
      return {
        email: signer?.Email || placeholder.email || '',
        name: signer?.Name || '',
        contact_id: placeholder.signerObjId || signer?.objectId || null,
        role: placeholder.Role || null,
        user_id: signer?.UserId?.objectId || signer?.UserId?.id || null,
      };
    });
  }

  return (document.Signers || []).map(signer => ({
    email: signer.Email || '',
    name: signer.Name || '',
    contact_id: signer.objectId || null,
    role: null,
    user_id: signer?.UserId?.objectId || signer?.UserId?.id || null,
  }));
}

function findAuditEntry(auditTrail, signer, activity) {
  const email = (signer.email || '').trim().toLowerCase();
  return (auditTrail || []).find(entry => {
    if (entry?.Activity !== activity) {
      return false;
    }
    if (signer.contact_id && entry?.UserPtr?.objectId === signer.contact_id) {
      return true;
    }
    return email && (entry?.UserPtr?.Email || '').trim().toLowerCase() === email;
  });
}

function buildSignerStatuses(document) {
  const signers = collectSigners(document);
  const auditTrail = document.AuditTrail || [];
  const declineById = document.DeclineBy?.objectId || document.DeclineBy?.id || null;
  let foundCurrent = false;

  return signers.map(signer => {
    const signedEntry = findAuditEntry(auditTrail, signer, 'Signed');
    const viewedEntry = findAuditEntry(auditTrail, signer, 'Viewed');
    const declinedBySigner =
      !!document.IsDeclined && declineById && signer.user_id && declineById === signer.user_id;

    let status = 'pending';
    if (signedEntry) {
      status = 'signed';
    } else if (declinedBySigner) {
      status = 'declined';
    } else if (document.SendinOrder) {
      if (foundCurrent) {
        status = 'waiting';
      } else {
        foundCurrent = true;
        status = 'pending';
      }
    }

    return {
      email: signer.email,
      name: signer.name,
      contact_id: signer.contact_id,
      role: signer.role,
      status,
      signed_on: dateIso(signedEntry?.SignedOn),
      viewed_on: dateIso(viewedEntry?.ViewedOn || signedEntry?.ViewedOn),
    };
  });
}

/**
 * Check whether a document has been signed by every signer.
 *
 * Auth: x-api-token (same as request-signature)
 * Input: document_id (query or body)
 */
async function handleSigningStatus(req, res) {
  try {
    ensureParse();
    const extUser = req.extUser;
    const documentId = (
      req.body?.document_id ||
      req.body?.documentId ||
      req.query?.document_id ||
      req.query?.documentId ||
      ''
    ).trim();

    if (!documentId) {
      return res.status(400).json({
        status: 'error',
        message: 'document_id is required.',
      });
    }

    const query = new Parse.Query('contracts_Document');
    query.equalTo('objectId', documentId);
    query.include('ExtUserPtr');
    query.include('Signers');
    query.include('Signers.UserId');
    query.include('AuditTrail.UserPtr');
    query.include('DeclineBy');
    query.notEqualTo('IsArchive', true);
    const doc = await query.first({ useMasterKey: true });

    if (!doc) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found.',
      });
    }

    const docExtUserId = doc.get('ExtUserPtr')?.id || doc.get('ExtUserPtr')?.objectId;
    if (docExtUserId !== extUser.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this document.',
      });
    }

    const document = JSON.parse(JSON.stringify(doc));
    const signers = buildSignerStatuses(document);
    const signedCount = signers.filter(signer => signer.status === 'signed').length;
    const totalSigners = signers.length;
    const pendingCount = totalSigners - signedCount;
    const allSignersSigned = totalSigners > 0 && signedCount === totalSigners;
    const signedByAll = Boolean(document.IsCompleted) || allSignersSigned;

    const expiryIso = dateIso(document.ExpiryDate);
    const isExpired = !signedByAll && expiryIso ? Date.now() > new Date(expiryIso).getTime() : false;
    const isSent = Boolean(document.SignedUrl || document.SentToOthers);

    let signingStatus = 'in_progress';
    if (document.IsDeclined) {
      signingStatus = 'declined';
    } else if (signedByAll) {
      signingStatus = 'completed';
    } else if (!isSent) {
      signingStatus = 'draft';
    } else if (isExpired) {
      signingStatus = 'expired';
    }

    return res.status(200).json({
      status: 'success',
      document_id: documentId,
      document_name: document.Name || '',
      signing_status: signingStatus,
      signed_by_all: signedByAll,
      is_completed: !!document.IsCompleted || allSignersSigned,
      is_declined: !!document.IsDeclined,
      is_expired: isExpired,
      is_sent: isSent,
      send_in_order: !!document.SendinOrder,
      signed_count: signedCount,
      total_signers: totalSigners,
      pending_count: pendingCount,
      expiry_date: expiryIso,
      decline_reason: document.DeclineReason || null,
      signers,
    });
  } catch (err) {
    console.log('signingStatus error', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to fetch signing status.',
    });
  }
}

export default function signingStatus(req, res) {
  return handleSigningStatus(req, res);
}
