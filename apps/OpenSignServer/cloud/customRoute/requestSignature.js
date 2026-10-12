import multer from 'multer';
import axios from 'axios';
import Parse from 'parse/node.js';
import {
  flattenPdf,
  getSecureUrl,
  cloudServerUrl,
  mailTemplate,
  replaceMailVaribles,
} from '../../Utils.js';
import { ensureParse } from './apiAuth.js';

const appId = process.env.APP_ID;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf')) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF files are allowed.'));
  },
}).single('file');

function publicOrigin() {
  const base = process.env.PUBLIC_URL || 'http://localhost:3000';
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/$/, '');
  }
}

function sanitizeFileName(name) {
  return (name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === true || value === 'true' || value === '1' || value === 1;
}

function parseReceivers(body) {
  const receivers = [];

  const rawReceivers = body.receivers ?? body.signers;
  if (rawReceivers) {
    let parsed = rawReceivers;
    if (typeof rawReceivers === 'string') {
      try {
        parsed = JSON.parse(rawReceivers);
      } catch {
        throw new Error('receivers must be a valid JSON array.');
      }
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('receivers must be a non-empty JSON array.');
    }
    parsed.forEach((receiver, index) => {
      const email = (receiver?.email || '').trim();
      if (!email) {
        throw new Error(`receivers[${index}].email is required.`);
      }
      receivers.push({
        email,
        name: (receiver?.name || '').trim(),
        phone: (receiver?.phone || '').trim(),
        role: (receiver?.role || '').trim(),
      });
    });
    return receivers;
  }

  const email = (body.email || '').trim();
  if (email) {
    receivers.push({
      email,
      name: (body.name || '').trim(),
      phone: (body.phone || '').trim(),
      role: (body.role || '').trim(),
    });
  }

  return receivers;
}

function contactPointer(contact) {
  return {
    __type: 'Pointer',
    className: 'contracts_Contactbook',
    objectId: contact.id,
  };
}

function assignContactToPlaceholder(placeholder, contact) {
  return {
    ...placeholder,
    email: contact.get('Email'),
    signerObjId: contact.id,
    signerPtr: contactPointer(contact),
  };
}

/**
 * Copy template Placeholders onto a new document and bind receivers.
 * Matching order:
 * 1. Explicit receiver.role ↔ placeholder.Role (case-insensitive)
 * 2. Remaining signer roles filled in template order
 * Prefill roles are kept as-is (no signer).
 */
function applyReceiversToPlaceholders(templatePlaceholders, contacts, receivers) {
  const placeholders = JSON.parse(JSON.stringify(templatePlaceholders || []));
  const signerIndexes = [];
  placeholders.forEach((placeholder, index) => {
    if (placeholder?.Role !== 'prefill') {
      signerIndexes.push(index);
    }
  });

  if (signerIndexes.length === 0) {
    throw new Error(
      'Template has no signer placeholders. Open the template in InstaSign and place signature fields first.'
    );
  }

  if (receivers.length < signerIndexes.length) {
    throw new Error(
      `Template has ${signerIndexes.length} signer role(s) but only ${receivers.length} receiver(s) were provided.`
    );
  }

  const assignedReceivers = new Set();

  // Pass 1: match by role name when both sides provide one
  for (const index of signerIndexes) {
    const role = (placeholders[index].Role || '').trim().toLowerCase();
    if (!role) {
      continue;
    }
    const receiverIndex = receivers.findIndex(
      (receiver, i) =>
        !assignedReceivers.has(i) && (receiver.role || '').trim().toLowerCase() === role
    );
    if (receiverIndex >= 0) {
      placeholders[index] = assignContactToPlaceholder(
        placeholders[index],
        contacts[receiverIndex]
      );
      placeholders[index].__bound = true;
      assignedReceivers.add(receiverIndex);
    }
  }

  // Pass 2: fill remaining signer slots in template order
  let nextReceiver = 0;
  for (const index of signerIndexes) {
    if (placeholders[index].__bound) {
      delete placeholders[index].__bound;
      continue;
    }
    while (assignedReceivers.has(nextReceiver) && nextReceiver < receivers.length) {
      nextReceiver += 1;
    }
    if (nextReceiver >= receivers.length) {
      throw new Error(
        `Could not assign a receiver to template role "${placeholders[index].Role || index + 1}".`
      );
    }
    placeholders[index] = assignContactToPlaceholder(
      placeholders[index],
      contacts[nextReceiver]
    );
    assignedReceivers.add(nextReceiver);
    nextReceiver += 1;
  }

  return placeholders;
}

async function findOrCreateContact(extUser, email, name, phone) {
  const ownerId = extUser.get('UserId')?.id || extUser.get('UserId')?.objectId;
  const ownerPtr = { __type: 'Pointer', className: '_User', objectId: ownerId };
  const normalizedEmail = email.trim().toLowerCase();

  const existing = new Parse.Query('contracts_Contactbook');
  existing.equalTo('CreatedBy', ownerPtr);
  existing.equalTo('Email', normalizedEmail);
  existing.notEqualTo('IsDeleted', true);
  const found = await existing.first({ useMasterKey: true });
  if (found) {
    return found;
  }

  const contact = new Parse.Object('contracts_Contactbook');
  contact.set('Name', name || normalizedEmail.split('@')[0]);
  contact.set('Email', normalizedEmail);
  if (phone) {
    contact.set('Phone', phone);
  }
  contact.set('UserRole', 'contracts_Guest');
  contact.set('IsDeleted', false);
  contact.set('CreatedBy', ownerPtr);

  const tenant = extUser.get('TenantId');
  if (tenant?.id || tenant?.objectId) {
    contact.set('TenantId', {
      __type: 'Pointer',
      className: 'partners_Tenant',
      objectId: tenant.id || tenant.objectId,
    });
  }

  let guestUser;
  try {
    const user = new Parse.User();
    user.set('name', name || normalizedEmail.split('@')[0]);
    user.set('username', normalizedEmail);
    user.set('email', normalizedEmail);
    user.set('password', normalizedEmail);
    if (phone) {
      user.set('phone', phone);
    }
    guestUser = await user.save(null, { useMasterKey: true });
  } catch (err) {
    if (err.code === 202) {
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('email', normalizedEmail);
      guestUser = await userQuery.first({ useMasterKey: true });
    } else {
      throw err;
    }
  }

  if (!guestUser) {
    throw new Error('Unable to resolve guest user for contact.');
  }

  contact.set('UserId', {
    __type: 'Pointer',
    className: '_User',
    objectId: guestUser.id,
  });

  const acl = new Parse.ACL();
  acl.setReadAccess(guestUser.id, true);
  acl.setWriteAccess(guestUser.id, true);
  acl.setReadAccess(ownerId, true);
  acl.setWriteAccess(ownerId, true);
  contact.setACL(acl);

  return contact.save(null, { useMasterKey: true });
}

async function uploadPdfBuffer(buffer, fileName) {
  const flatPdf = await flattenPdf(buffer);
  const parseFile = new Parse.File(sanitizeFileName(fileName), [...flatPdf], 'application/pdf');
  await parseFile.save({ useMasterKey: true });
  const secure = getSecureUrl(parseFile.url());
  return secure.url;
}

async function loadTemplateForUser(templateId, extUser) {
  const ownerQuery = new Parse.Query('contracts_Template');
  ownerQuery.equalTo('objectId', templateId);
  ownerQuery.equalTo('ExtUserPtr', {
    __type: 'Pointer',
    className: 'contracts_Users',
    objectId: extUser.id,
  });
  ownerQuery.notEqualTo('IsArchive', true);

  let query = ownerQuery;

  const extUserWithTeams = await new Parse.Query('contracts_Users')
    .include('TeamIds')
    .get(extUser.id, { useMasterKey: true });
  const teamIds = extUserWithTeams.get('TeamIds') || [];
  if (teamIds.length > 0) {
    let teamsArr = [];
    teamIds.forEach(team => {
      const ancestors = team.get?.('Ancestors') || team.Ancestors || [];
      teamsArr = [...teamsArr, ...ancestors];
    });
    if (teamsArr.length > 0) {
      const sharedQuery = new Parse.Query('contracts_Template');
      sharedQuery.equalTo('objectId', templateId);
      sharedQuery.containedIn('SharedWith', teamsArr);
      sharedQuery.notEqualTo('IsArchive', true);
      query = Parse.Query.or(ownerQuery, sharedQuery);
    }
  }

  const template = await query.first({ useMasterKey: true });
  if (!template) {
    throw new Error('Template not found or not accessible for this account.');
  }
  const placeholders = template.get('Placeholders') || [];
  if (!Array.isArray(placeholders) || placeholders.length === 0) {
    throw new Error(
      'Template has no saved field layout. Open the template in InstaSign and place signature fields first.'
    );
  }
  return template;
}

function formatExpiryDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function sendSigningMail(documentJson, signer) {
  const hostUrl = publicOrigin();
  const encodeBase64 = Buffer.from(
    `${documentJson.objectId}/${signer.Email}/${signer.objectId}`,
    'utf8'
  ).toString('base64');
  const signPdf = `${hostUrl}/login/${encodeBase64}`;

  const senderName = documentJson?.ExtUserPtr?.Name || '';
  const senderEmail = documentJson?.ExtUserPtr?.Email || '';
  const orgName = documentJson?.ExtUserPtr?.Company || '';
  const localExpireDate = documentJson?.ExpiryDate?.iso
    ? formatExpiryDate(documentJson.ExpiryDate.iso)
    : '';

  const mailBody =
    documentJson?.RequestBody || documentJson?.ExtUserPtr?.TenantId?.RequestBody || '';
  const mailSubject =
    documentJson?.RequestSubject || documentJson?.ExtUserPtr?.TenantId?.RequestSubject || '';

  let mailContent;
  if (mailBody && mailSubject) {
    const replacedRequestBody = mailBody.replace(/"/g, "'");
    const htmlReqBody =
      "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body>" +
      replacedRequestBody +
      '</body></html>';
    const variables = {
      document_title: documentJson?.Name,
      sender_name: senderName,
      sender_mail: senderEmail,
      sender_phone: documentJson?.ExtUserPtr?.Phone || '',
      receiver_name: signer?.Name || '',
      receiver_email: signer?.Email || '',
      receiver_phone: signer?.Phone || '',
      expiry_date: localExpireDate,
      company_name: orgName,
      signing_url: `<a href=${signPdf} target=_blank>Sign here</a>`,
    };
    mailContent = replaceMailVaribles(mailSubject, htmlReqBody, variables);
  } else {
    const fallback = mailTemplate({
      senderName,
      senderMail: senderEmail,
      title: documentJson.Name,
      organization: orgName,
      localExpireDate,
      sigingUrl: signPdf,
    });
    mailContent = { subject: fallback.subject, body: fallback.body };
  }

  const params = {
    extUserId: documentJson.ExtUserPtr.objectId,
    recipient: signer.Email,
    subject: mailContent.subject,
    from: senderEmail,
    replyto: senderEmail || '',
    html: mailContent.body,
  };

  const response = await axios.post(`${cloudServerUrl}/functions/sendmailv3`, params, {
    headers: {
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': appId,
    },
  });

  return response?.data?.result;
}

/**
 * Create a contracts_Document for external integrations.
 * With template_id: copies that template's Placeholders onto the new PDF.
 * With send=true: marks the document sent and emails signers.
 * send does not require template_id.
 */
async function handleRequestSignature(req, res) {
  try {
    ensureParse();
    const extUser = req.extUser;
    const noteProvided =
      req.body.note !== undefined && req.body.note !== null && String(req.body.note).trim() !== '';
    const note = noteProvided ? String(req.body.note).trim() : '';
    const documentName =
      (req.body.document_name || req.body.documentName || req.file?.originalname || 'Untitled Document')
        .replace(/\.pdf$/i, '')
        .trim();
    const daysRaw = req.body.days ?? req.body.TimeToCompleteDays;
    const timeToCompleteDays =
      daysRaw !== undefined && daysRaw !== null && String(daysRaw).trim() !== ''
        ? parseInt(daysRaw, 10)
        : NaN;
    const kycRequired = parseBoolean(
      req.body.kyc_required ?? req.body.kycRequired ?? req.body.KycRequired,
      false
    );
    const sendInOrderBody = req.body.send_in_order ?? req.body.sendInOrder ?? req.body.SendinOrder;
    const sendInOrderProvided =
      sendInOrderBody !== undefined && sendInOrderBody !== null && sendInOrderBody !== '';
    const sendInOrder = parseBoolean(sendInOrderBody, true);
    const autoSend = parseBoolean(req.body.send ?? req.body.auto_send ?? req.body.autoSend, false);
    const templateId = (
      req.body.template_id ||
      req.body.templateId ||
      req.body.TemplateId ||
      ''
    ).trim();

    let receivers;
    try {
      receivers = parseReceivers(req.body);
    } catch (parseErr) {
      return res.status(400).json({ status: 'error', message: parseErr.message });
    }

    if (receivers.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one receiver is required. Use email or receivers JSON array.',
      });
    }
    if (!req.file?.buffer && !req.body.fileBase64) {
      return res.status(400).json({
        status: 'error',
        message: 'PDF file is required (multipart field "file" or JSON fileBase64).',
      });
    }
    let template = null;
    let placeholders = null;
    if (templateId) {
      try {
        template = await loadTemplateForUser(templateId, extUser);
      } catch (templateErr) {
        return res.status(404).json({ status: 'error', message: templateErr.message });
      }
    }

    let fileUrl;
    if (req.file?.buffer) {
      fileUrl = await uploadPdfBuffer(req.file.buffer, req.file.originalname || `${documentName}.pdf`);
    } else {
      const base64 = req.body.fileBase64.includes(',')
        ? req.body.fileBase64.split(',')[1]
        : req.body.fileBase64;
      fileUrl = await uploadPdfBuffer(Buffer.from(base64, 'base64'), `${documentName}.pdf`);
    }

    if (!fileUrl) {
      return res.status(500).json({ status: 'error', message: 'Failed to upload PDF.' });
    }

    const contacts = [];
    for (const receiver of receivers) {
      const contact = await findOrCreateContact(
        extUser,
        receiver.email,
        receiver.name,
        receiver.phone
      );
      contacts.push(contact);
    }

    if (template) {
      try {
        placeholders = applyReceiversToPlaceholders(
          template.get('Placeholders') || [],
          contacts,
          receivers
        );
      } catch (mapErr) {
        return res.status(400).json({ status: 'error', message: mapErr.message });
      }
    }

    // Signers ordered to match non-prefill placeholder roles when a template is used
    let orderedContacts = contacts;
    if (placeholders) {
      const roleContactIds = placeholders
        .filter(item => item?.Role !== 'prefill' && item?.signerObjId)
        .map(item => item.signerObjId);
      orderedContacts = roleContactIds
        .map(id => contacts.find(contact => contact.id === id))
        .filter(Boolean);
      // Keep any extra receivers that were not mapped to a role
      contacts.forEach(contact => {
        if (!orderedContacts.some(item => item.id === contact.id)) {
          orderedContacts.push(contact);
        }
      });
    }

    const ownerId = extUser.get('UserId')?.id || extUser.get('UserId')?.objectId;
    const resolvedSendInOrder = sendInOrderProvided
      ? sendInOrder
      : template
        ? Boolean(template.get('SendinOrder'))
        : true;
    const resolvedDays = Number.isFinite(timeToCompleteDays)
      ? timeToCompleteDays
      : template?.get('TimeToCompleteDays') || 15;

    const resolvedNote = noteProvided
      ? note
      : template
        ? template.get('Note') || 'Please review and sign this document.'
        : '';

    const doc = new Parse.Object('contracts_Document');
    doc.set('Name', documentName);
    doc.set('Note', resolvedNote);
    doc.set('URL', fileUrl);
    doc.set('KycRequired', kycRequired);
    doc.set('TimeToCompleteDays', resolvedDays);
    doc.set('SendinOrder', resolvedSendInOrder);
    doc.set(
      'AutomaticReminders',
      template ? Boolean(template.get('AutomaticReminders')) : false
    );
    doc.set('RemindOnceInEvery', template?.get('RemindOnceInEvery') || 5);
    doc.set('IsTourEnabled', template ? Boolean(template.get('IsTourEnabled')) : true);
    doc.set(
      'AllowModifications',
      template ? Boolean(template.get('AllowModifications')) : false
    );
    doc.set('IsEnableOTP', template ? Boolean(template.get('IsEnableOTP')) : false);
    doc.set('CreatedBy', {
      __type: 'Pointer',
      className: '_User',
      objectId: ownerId,
    });
    doc.set('ExtUserPtr', {
      __type: 'Pointer',
      className: 'contracts_Users',
      objectId: extUser.id,
    });
    doc.set(
      'Signers',
      orderedContacts.map(contact => contactPointer(contact))
    );

    if (placeholders) {
      doc.set('Placeholders', placeholders);
    }

    if (template?.get('SignatureType')) {
      doc.set('SignatureType', template.get('SignatureType'));
    }
    if (template?.get('NotifyOnSignatures') !== undefined) {
      doc.set('NotifyOnSignatures', template.get('NotifyOnSignatures'));
    }
    if (template?.get('RedirectUrl')) {
      doc.set('RedirectUrl', template.get('RedirectUrl'));
    }
    if (template?.get('Bcc')?.length) {
      doc.set('Bcc', template.get('Bcc'));
    }
    if (template) {
      doc.set('TemplateId', {
        __type: 'Pointer',
        className: 'contracts_Template',
        objectId: template.id,
      });
    }

    if (autoSend) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + resolvedDays);
      doc.set('SignedUrl', fileUrl);
      doc.set('SentToOthers', true);
      doc.set('ExpiryDate', expiry);
      doc.set('DocSentAt', new Date());
    }

    const acl = new Parse.ACL();
    acl.setReadAccess(ownerId, true);
    acl.setWriteAccess(ownerId, true);
    orderedContacts.forEach(contact => {
      const contactUserId = contact.get('UserId')?.id || contact.get('UserId')?.objectId;
      if (contactUserId) {
        acl.setReadAccess(contactUserId, true);
        acl.setWriteAccess(contactUserId, true);
      }
    });
    doc.setACL(acl);

    const saved = await doc.save(null, { useMasterKey: true });
    const prepareUrl = `${publicOrigin()}/placeHolderSign/${saved.id}`;

    const roleBindings =
      placeholders
        ?.filter(item => item?.Role !== 'prefill')
        .map(item => ({
          role: item.Role || null,
          email: item.email || null,
          contact_id: item.signerObjId || null,
        })) || [];

    let emailsSent = [];
    if (autoSend) {
      // Reload with includes for mail templates / signer details
      const sentQuery = new Parse.Query('contracts_Document');
      sentQuery.equalTo('objectId', saved.id);
      sentQuery.include('ExtUserPtr');
      sentQuery.include('ExtUserPtr.TenantId');
      sentQuery.include('Signers');
      const sentDoc = await sentQuery.first({ useMasterKey: true });
      const documentJson = JSON.parse(JSON.stringify(sentDoc));

      let mailTargets = placeholders
        ? (documentJson.Placeholders || [])
            .filter(item => item?.Role !== 'prefill' && item?.signerObjId)
            .map(item => (documentJson.Signers || []).find(s => s.objectId === item.signerObjId))
            .filter(Boolean)
        : (documentJson.Signers || []).filter(signer => signer?.Email);

      if (documentJson.SendinOrder) {
        mailTargets = mailTargets.slice(0, 1);
      }

      for (const signer of mailTargets) {
        try {
          await sendSigningMail(documentJson, signer);
          emailsSent.push(signer.Email);
        } catch (mailErr) {
          console.log('requestSignature send mail error', mailErr?.message || mailErr);
        }
      }

      // Bump document count (mirrors DocumentBeforesave SignedUrl transition)
      try {
        const extCls = new Parse.Object('contracts_Users');
        extCls.id = extUser.id;
        extCls.increment('DocumentCount', 1);
        await extCls.save(null, { useMasterKey: true });
      } catch (countErr) {
        console.log('requestSignature DocumentCount error', countErr?.message || countErr);
      }
    }

    const baseResponse = {
      status: 'success',
      document_id: saved.id,
      prepare_url: prepareUrl,
      kyc_required: kycRequired,
      send_in_order: resolvedSendInOrder,
      template_id: template?.id || null,
      placeholders_applied: Boolean(placeholders),
      role_bindings: roleBindings,
      receivers: orderedContacts.map(contact => ({
        email: contact.get('Email'),
        name: contact.get('Name'),
        contact_id: contact.id,
      })),
    };

    if (autoSend) {
      return res.status(201).json({
        ...baseResponse,
        sent: true,
        emails_sent: emailsSent,
        message: placeholders
          ? 'Document created from template and sent. Signers have been emailed (or the first signer if send_in_order is true).'
          : 'Document created and sent. Signers have been emailed (or the first signer if send_in_order is true).',
      });
    }

    if (placeholders) {
      return res.status(201).json({
        ...baseResponse,
        sent: false,
        message:
          'Draft created with template layout applied. Open prepare_url to review fields and send, or call again with send=true to email signers automatically.',
      });
    }

    return res.status(201).json({
      ...baseResponse,
      sent: false,
      message:
        'Draft created. Open prepare_url while logged in as the document owner to place signature fields, then send.',
    });
  } catch (err) {
    console.log('requestSignature error', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to create signature request.',
    });
  }
}

export default function requestSignature(req, res) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload(req, res, err => {
      if (err) {
        return res.status(400).json({ status: 'error', message: err.message || 'Upload failed.' });
      }
      return handleRequestSignature(req, res);
    });
  } else {
    return handleRequestSignature(req, res);
  }
}
