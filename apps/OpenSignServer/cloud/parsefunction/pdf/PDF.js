import fs from 'node:fs';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import {
  cloudServerUrl,
  replaceMailVaribles,
  saveFileUsage,
  getSecureUrl,
  appName,
  mailTemplate,
} from '../../../Utils.js';
import GenerateCertificate from './GenerateCertificate.js';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import { Placeholder } from './Placeholder.js';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';

const serverUrl = process.env.SERVER_URL || cloudServerUrl;
const APPID = process.env.APP_ID;
const masterKEY = process.env.MASTER_KEY;
const eSignName = 'InstaSign';
const eSigncontact = 'support@instasign.ai';
// const logo =
//   "<img src='https://qikinnovation.ams3.digitaloceanspaces.com/logo.png' height='50' style='padding:20px'/>";

const logo =
  "https://api.dev.instasign.ai/media/new_instasign_logo.png";
const opurl = ` <a href=https://instasign.ai style="color: #ffffff;" target=_blank>here</a>`;

// `updateDoc` is used to create url in from pdfFile
async function uploadFile(pdfName, filepath) {
  try {
    const filedata = fs.readFileSync(filepath);
    let fileUrl;
    const file = new Parse.File(pdfName, [...filedata], 'application/pdf');
    await file.save({ useMasterKey: true });
    const fileRes = getSecureUrl(file.url());
    fileUrl = fileRes.url;

    return { imageUrl: fileUrl };
  } catch (err) {
    console.log('Err ', err);
    // `fs.unlinkSync` is used to remove exported signed pdf file from exports folder
    fs.unlinkSync(filepath);
  }
}

// `updateDoc` is used to update signedUrl, AuditTrail, Iscompleted in document
async function updateDoc(docId, url, userId, ipAddress, data, className, sign) {
  try {
    const UserPtr = { __type: 'Pointer', className: className, objectId: userId };
    const obj = {
      UserPtr: UserPtr,
      SignedUrl: url,
      Activity: 'Signed',
      ipAddress: ipAddress,
      SignedOn: new Date(),
      Signature: sign,
    };
    let updateAuditTrail;
    if (data.AuditTrail && data.AuditTrail.length > 0) {
      const AuditTrail = JSON.parse(JSON.stringify(data.AuditTrail));
      const existingIndex = AuditTrail.findIndex(
        entry => entry.UserPtr.objectId === userId && entry.Activity !== 'Created'
      );
      existingIndex !== -1
        ? (AuditTrail[existingIndex] = { ...AuditTrail[existingIndex], ...obj })
        : AuditTrail.push(obj);

      updateAuditTrail = AuditTrail;
    } else {
      updateAuditTrail = [obj];
    }

    const auditTrail = updateAuditTrail.filter(x => x.Activity === 'Signed');
    let isCompleted = false;
    if (data.Signers && data.Signers.length > 0) {
      if (auditTrail.length === data.Placeholders.length) {
        isCompleted = true;
      }
    } else {
      isCompleted = true;
    }
    const body = { SignedUrl: url, AuditTrail: updateAuditTrail, IsCompleted: isCompleted };
    const signedRes = await axios.put(serverUrl + '/classes/contracts_Document/' + docId, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Parse-Application-Id': APPID,
        'X-Parse-Master-Key': masterKEY,
      },
    });
    return { isCompleted: isCompleted, message: 'success', AuditTrail: updateAuditTrail };
  } catch (err) {
    console.log('update doc err ', err);
    return 'err';
  }
}

// `sendNotifyMail` is used to send notification mail of signer signed the document
async function sendNotifyMail(doc, signUser, mailProvider) {
  try {
    const auditTrailCount = doc?.AuditTrail?.filter(x => x.Activity === 'Signed')?.length || 0;
    const signersCount = doc?.Placeholders?.length;
    const remaingsign = signersCount - auditTrailCount;
    if (remaingsign > 1 && doc?.NotifyOnSignatures) {
      const sender = doc.ExtUserPtr;
      const pdfName = doc.Name;
      const creatorName = doc.ExtUserPtr.Name;
      const creatorEmail = doc.ExtUserPtr.Email;
      const signerName = signUser.Name;
      const signerEmail = signUser.Email;
      const viewDocUrl = `${process.env.PUBLIC_URL}/recipientSignPdf/${doc.objectId}`;
      const subject = `Document "${pdfName}" has been signed by ${signerName}`;
      // const body =
      //   "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'/></head><body><div style='background-color:#f5f5f5;padding:20px'><div style='background-color:white'>" +
      //   `<div>${logo}</div><div style='padding:2px;font-family:system-ui;background-color:#47a3ad'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px'>Document signed by ${signerName}</p>` +
      //   `</div><div style='padding:20px;font-family:system-ui;font-size:14px'><p>Dear ${creatorName},</p><p>${pdfName} has been signed by ${signerName} "${signerEmail}" successfully</p>` +
      //   `<p><a href=${viewDocUrl} target=_blank>View Document</a></p></div></div><div><p>This is an automated email from ${appName}. For any queries regarding this email, ` +
      //   `please contact the sender ${creatorEmail} directly. If you think this email is inappropriate or spam, you may file a complaint with ${appName}${opurl}.</p></div></div></body></html>`;

//       const body = `
//       <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
//     <meta content="width=device-width, initial-scale=1.0" name="viewport" />
//     <title>Document Signed Notification</title>
//     <style>
//         * {
//             box-sizing: border-box;
//         }
//         body {
//             margin: 0;
//             padding: 0;
//             background-color: #002864;
//             -webkit-text-size-adjust: none;
//             text-size-adjust: none;
//         }
//         a {
//             color: #a6dc9e;
//             text-decoration: none;
//         }
//         a:hover {
//             text-decoration: underline;
//         }
//         p {
//             line-height: 1.5;
//         }
//         .nl-container {
//             width: 100%;
//             background-color: #002864;
//         }
//         .row-content {
//             width: 680px;
//             margin: 0 auto;
//             background-color: #ffffff;
//             color: #000000;
//         }
//         .column {
//             font-weight: 400;
//             text-align: left;
//             vertical-align: top;
//             border: 0;
//         }
//         .image_block img {
//             display: block;
//             height: auto;
//             border: 0;
//             width: 100%;
//         }
//         .text_block {
//             word-break: break-word;
//         }
//         .button_block a {
//             display: inline-block;
//             padding: 10px 20px;
//             background-color: #0159C3;
//             color: #ffffff;
//             border-radius: 5px;
//             text-decoration: none;
//             font-size: 16px;
//         }
//         .button_block a:hover {
//             background-color: #0147a0;
//         }
//         .social_block .social-table {
//             display: inline-block;
//         }
//         .social_block img {
//             display: block;
//             height: 32px;
//             width: 32px;
//         }
//         @media (max-width: 700px) {
//             .row-content {
//                 width: 100% !important;
//             }
//             .stack .column {
//                 width: 100%;
//                 display: block;
//             }
//             .image_block div.fullWidth {
//                 max-width: 100% !important;
//             }
//             .text_block td.pad {
//                 padding: 15px !important;
//             }
//         }
//     </style>
// </head>
// <body>
//     <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//         <tbody>
//             <tr>
//                 <td>
//                     <!-- Header -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 10px 0;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px 0; width: 100%;">
//                                                                 <div align="center" class="alignment" style="line-height:10px">
//                                                                     <div style="max-width: 136px;">
//                                                                         <img src=${logo} style="width: 100%;" width="136" alt="Logo" />
//                                                                     </div>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Main Content -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 20px;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; color: #ffffff;">
//                                                                     <p style="margin: 0; font-size: 24px; text-align: center; line-height: 1.2;">
//                                                                         Document Signed by ${signerName}
//                                                                     </p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 20px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 16px; color: #ffffff; line-height: 1.5;">
//                                                                     <p style="margin: 0 0 10px;">Dear ${creatorName},</p>
//                                                                     <p style="margin: 0 0 10px;">${pdfName} has been signed by ${signerName} (${signerEmail}) successfully.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="button_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px; text-align: center;">
//                                                                 <a href="${viewDocUrl}" target="_blank">View Document</a>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Footer -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px 0;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 20px;">
//                                                                 <div align="center" class="alignment" style="line-height:10px">
//                                                                     <div style="max-width: 530px;">
//                                                                         <img alt="Wave decoration image" src="https://api.dev.gurujibayarea.com/media/images/waves.png" style="width: 100%;" width="530" />
//                                                                     </div>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.2; text-align: center;">
//                                                                     <p style="margin: 0;">This is an automated email from ${appName}. For any queries, please contact the sender <a href="mailto:${creatorEmail}" style="color: #ffffff;" target="_blank">${creatorEmail}</a>  directly.</p>
//                                                                     <p style="margin: 5px 0;">If you think this email is inappropriate or spam, you may file a complaint with ${appName} <a href="${opurl}" style="color: #ffffff;" target="_blank">here</a>.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="social_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div align="center" class="alignment">
//                                                                     <table border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="108px">
//                                                                         <tr>
//                                                                             <td style="padding:0 2px;"><a href="https://www.facebook.com" target="_blank"><img alt="Facebook" src="https://api.dev.gurujibayarea.com/media/images/facebook2x.png" /></a></td>
//                                                                             <td style="padding:0 2px;"><a href="https://www.twitter.com" target="_blank"><img alt="Twitter" src="https://api.dev.gurujibayarea.com/media/images/twitter2x.png" /></a></td>
//                                                                             <td style="padding:0 2px;"><a href="https://www.linkedin.com/" target="_blank"><img alt="LinkedIn" src="https://api.dev.gurujibayarea.com/media/images/linkedin2x.png" /></a></td>
//                                                                         </tr>
//                                                                     </table>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.2; text-align: center;">
//                                                                     <p style="margin: 0;">Product Developed by <a href="https://www.intuitiveapps.com" target="_blank" style="color: #a6dc9e;">Intuitive Apps Inc.</a></p>
//                                                                     <p style="margin: 0;">India | USA | Canada</p>
//                                                                     <p style="margin: 0;">Our Privacy Policy and Terms of Use.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Spacer -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 20px 0;" width="100%">
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                 </td>
//             </tr>
//         </tbody>
//     </table>
// </body>
// </html>
//       `

      const body = `

        <!DOCTYPE html>

<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">

<head>
	<title></title>
	<meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
	<meta content="width=device-width, initial-scale=1.0" name="viewport" />
	<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		.menu_block.desktop_hide .menu-links span {
			mso-hide: all;
		}

		@media (max-width:700px) {

			.desktop_hide table.icons-inner,
			.social_block.desktop_hide .social-table {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.image_block div.fullWidth {
				max-width: 100% !important;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}

			.row-3 .column-1 .block-1.text_block td.pad {
				padding: 0 !important;
			}

			.row-4 .column-1 .block-1.text_block td.pad {
				padding: 15px !important;
			}

			.row-4 .column-1 .block-2.text_block td.pad {
				padding: 20px !important;
			}
		}
	</style>
</head>

<body style="background-color: #cbdee9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation"
		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #cbdee9;" width="100%">
		<tbody>
			<tr>
				<td>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="0" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="padding-bottom:10px;padding-top:10px;width:100%;padding-right:0px;padding-left:0px;">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 272px;"><img
																			src="https://api.dev.instasign.ai/media/new_instasign_logo.png"
																			style="margin-left: 1.5rem; display: block; height: auto; border: 0; width: 100%;"
																			width="272"/></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto;"
						width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="0" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="width:100%;padding-right:0px;padding-left:0px;">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div class="fullWidth" style="max-width: 680px;">
																		<img src="https://img.freepik.com/free-vector/hiring-concept-illustration_114360-532.jpg?t=st=1746764851~exp=1746768451~hmac=e7d964fa7015e23038369409694518530e2d51c2ff97aad2723c060716e4849b&w=740"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			width="680" /></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;">
																			 </p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 10px; padding-right: 10px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
																			<span style="font-size:30px;">Document Signed by {{signerName}}</span></p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="20" cellspacing="0"
														class="text_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 21px; color: #ffffff; line-height: 1.5;">
																		
                                                                        <p
																			style="margin: 0; font-size: 14px; text-align: justify; mso-line-height-alt: 21px;">
																			Dear {{creatorName}},
																			</p>
                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
                                                                        <p
																			style="margin: 0; font-size: 14px; text-align: justify; mso-line-height-alt: 21px;">
																			"${pdfName}" has been signed by ${signerName} (${signerEmail}) successfully.
																			</p>
                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
														

                                                                            <table border="0" cellpadding="0" cellspacing="0" class="button_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                                                                                <tr>
                                                                                    <td class="pad" style="padding: 10px; text-align: center;">
                                                                                        <a href="{{viewDocUrl}}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px; border: 1px solid #3e8e41; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" target="_blank">View Document</a>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>

                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			This is an automated email from InstaSign™. For any queries regarding this email, please contact the sender {{creatorEmail}} directly. If you think this email is inappropriate or spam, you may file a complaint with InstaSign™ <a href="https://instasign.ai" style="color: #ffffff;" target="_blank">here</a>".</p>
																	
                                                                        </div>
																</div>
															</td>
														</tr>
													</table>
                                                    
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="20" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 530px;"><img
																			alt="Wave decoration image"
																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			title="Wave decoration image" width="530" />
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
																			<span style="font-size:26px;">Thank
																				you </span></p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="20" cellspacing="0"
														class="image_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 530px;"><img
																			alt="Wave decoration image"
																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			title="Wave decoration image" width="530" />
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; background-repeat: no-repeat; width: 680px; margin: 0 auto;"
										
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 0px; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="social_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment">
																	<table border="0" cellpadding="0" cellspacing="0"
																		class="social-table" role="presentation"
																		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;"
																		width="108px">
																		<tr>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.facebook.com"
																					target="_blank"><img alt="Facebook"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/facebook2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="facebook"
																						width="32" /></a></td>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.twitter.com"
																					target="_blank"><img alt="Twitter"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/twitter2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="twitter"
																						width="32" /></a></td>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.linkedin.com/"
																					target="_blank"><img alt="LinkedIn"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/linkedin2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="LinkedIn"
																						width="32" /></a></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			Product Developed by <a
																				href="https://www.intuitiveapps.com"
																				rel="noopener"
																				style="text-decoration: underline; color: #a6dc9e;"
																				target="_blank"
																				title="IT Consulting & Software Development Enterprise">Intuitive
																				Apps Inc.</a></p>
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			India | USA | Canada </p>
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			Our Privacy Policy and Terms of Use. </p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="0" cellspacing="0"
														class="menu_block block-3" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="color:#cccccc;font-family:inherit;font-size:12px;text-align:center;">
																<table border="0" cellpadding="0" cellspacing="0"
																	role="presentation"
																	style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
																	width="100%">
																	<tr>
																		<td class="alignment"
																			style="text-align:center;font-size:0px;">
																			<div class="menu-links">
																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="mailto:support@instasign.ai"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">support@instasign.ai
																				</a><!--[if mso]></td><td><![endif]--><span
																					class="sep"
																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="tel:+918130696679"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">+91
																					8130696679</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
																			</div>
																		</td>
																	</tr>
																	<tr>
																		<td class="alignment"
																			style="text-align:center;font-size:0px;">
																			<div class="menu-links">
																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="mailto:support@instasign.ai"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">USA
																				</a><!--[if mso]></td><td><![endif]--><span
																					class="sep"
																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="tel:+14083419417"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">+1
																					4083419417</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
																			</div>
																		</td>
																	</tr>
																</table>
															</td>
														</tr>
													</table>
													<div class="spacer_block block-4"
														style="height:30px;line-height:30px;font-size:1px;"> </div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<div class="spacer_block block-1"
														style="height:20px;line-height:20px;font-size:1px;"> </div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>
      `

      const params = {
        extUserId: sender.objectId,
        from: appName,
        recipient: creatorEmail,
        subject: subject,
        pdfName: pdfName,
        html: body,
        mailProvider: mailProvider,
      };
      await axios.post(serverUrl + '/functions/sendmailv3', params, {
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Application-Id': APPID,
          'X-Parse-Master-Key': masterKEY,
        },
      });
    }
  } catch (err) {
    console.log('err in sendnotifymail', err);
  }
}

function publicOrigin() {
  const base = process.env.PUBLIC_URL || 'http://localhost:3000';
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/$/, '');
  }
}

function hasSignedByEmail(auditTrail, email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (auditTrail || []).some(
    entry =>
      entry?.Activity === 'Signed' &&
      (entry?.UserPtr?.Email || '').trim().toLowerCase() === normalized
  );
}

function hasSignedById(auditTrail, objectId) {
  if (!objectId) {
    return false;
  }
  return (auditTrail || []).some(
    entry =>
      entry?.Activity === 'Signed' && entry?.UserPtr?.objectId === objectId
  );
}

/**
 * When SendinOrder is enabled, email the next pending signer after someone signs.
 * Runs on the server so it is not blocked by client `sendmail=false` share links.
 */
async function sendNextSignerMail(doc, currentSignerId, auditTrail) {
  try {
    if (!doc?.SendinOrder) {
      return;
    }
    const placeholders = (doc.Placeholders || []).filter(
      item => item?.Role !== 'prefill'
    );
    if (!placeholders.length) {
      return;
    }

    const currentIndex = placeholders.findIndex(
      p => p.signerObjId === currentSignerId
    );
    const nextPlaceholders =
      currentIndex >= 0 ? placeholders.slice(currentIndex + 1) : placeholders;

    let nextSigner = null;
    for (const placeholder of nextPlaceholders) {
      const signer = placeholder?.signerObjId
        ? (doc.Signers || []).find(s => s.objectId === placeholder.signerObjId)
        : null;
      const email = signer?.Email || placeholder?.email;
      const objectId = signer?.objectId || placeholder?.signerObjId;
      if (!email) {
        continue;
      }
      if (
        objectId === currentSignerId ||
        hasSignedByEmail(auditTrail, email) ||
        hasSignedById(auditTrail, objectId)
      ) {
        continue;
      }
      nextSigner = signer || {
        Email: email,
        Name: placeholder?.Name || '',
        objectId,
        Phone: placeholder?.phone || '',
      };
      break;
    }

    if (!nextSigner?.Email) {
      console.log('sendNextSignerMail: no pending next signer');
      return;
    }

    const sender = doc.ExtUserPtr || {};
    const senderName = sender.Name || '';
    const senderEmail = sender.Email || '';
    const orgName = sender.Company || '';
    const localExpireDate = doc?.ExpiryDate?.iso
      ? new Date(doc.ExpiryDate.iso).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

    const hostUrl = publicOrigin();
    const encodeBase64 = Buffer.from(
      nextSigner.objectId
        ? `${doc.objectId}/${nextSigner.Email}/${nextSigner.objectId}`
        : `${doc.objectId}/${nextSigner.Email}`,
      'utf8'
    ).toString('base64');
    const signPdf = `${hostUrl}/login/${encodeBase64}`;

    const requestBody =
      doc?.RequestBody || sender?.TenantId?.RequestBody || '';
    const requestSubject =
      doc?.RequestSubject || sender?.TenantId?.RequestSubject || '';

    let mailSubject;
    let mailHtml;
    if (requestBody && requestSubject) {
      const replacedRequestBody = requestBody.replace(/"/g, "'");
      const htmlReqBody =
        "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body>" +
        replacedRequestBody +
        '</body></html>';
      const variables = {
        document_title: doc?.Name,
        sender_name: senderName,
        sender_mail: senderEmail,
        sender_phone: sender?.Phone || '',
        receiver_name: nextSigner?.Name || '',
        receiver_email: nextSigner.Email,
        receiver_phone: nextSigner?.Phone || '',
        expiry_date: localExpireDate,
        company_name: orgName,
        signing_url: `<a href=${signPdf} target=_blank>Sign here</a>`,
      };
      const replaced = replaceMailVaribles(
        requestSubject,
        htmlReqBody,
        variables
      );
      mailSubject = replaced.subject;
      mailHtml = replaced.body;
    } else {
      const fallback = mailTemplate({
        senderName,
        senderMail: senderEmail,
        title: doc.Name,
        organization: orgName,
        localExpireDate,
        sigingUrl: signPdf,
      });
      mailSubject = fallback.subject;
      mailHtml = fallback.body;
    }

    const params = {
      extUserId: sender.objectId,
      recipient: nextSigner.Email,
      subject: mailSubject,
      from: senderEmail,
      replyto: senderEmail || '',
      html: mailHtml,
    };

    console.log(
      `sendNextSignerMail: sending to ${nextSigner.Email} for doc ${doc.objectId}`
    );
    await axios.post(`${serverUrl}/functions/sendmailv3`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-Parse-Application-Id': APPID,
        'X-Parse-Master-Key': masterKEY,
      },
    });
  } catch (err) {
    console.log('err in sendNextSignerMail', err);
  }
}

// `sendCompletedMail` is used to send copy of completed document mail
async function sendCompletedMail(obj) {
  const url = obj.doc?.SignedUrl;
  const doc = obj.doc;
  const sender = obj.doc.ExtUserPtr;
  const pdfName = doc.Name;
  let signersMail;
  if (doc?.Signers?.length > 0) {
    const isOwnerExistsinSigners = doc?.Signers?.find(x => x.Email === sender.Email);
    signersMail = isOwnerExistsinSigners
      ? doc?.Signers?.map(x => x?.Email)?.join(',')
      : [...doc?.Signers?.map(x => x?.Email), sender.Email]?.join(',');
  } else {
    signersMail = sender.Email;
  }
  const recipient = signersMail;
  let subject = `Document "${pdfName}" has been signed by all parties`;
//   let body =
//     "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><div style='background-color:#f5f5f5;padding:20px'><div style='background-color:white'>" +
//     `<div>${logo}</div><div style='padding:2px;font-family:system-ui;background-color:#47a3ad'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px'>Document signed successfully</p></div><div>` +
//     `<p style='padding:20px;font-family:system-ui;font-size:14px'>All parties have successfully signed the document <b>"${pdfName}"</b>. Kindly download the document from the attachment.</p>` +
//     `</div></div><div><p>This is an automated email from ${appName}. For any queries regarding this email, please contact the sender ${sender.Email} directly.` +
//     `If you think this email is inappropriate or spam, you may file a complaint with ${appName}${opurl}.</p></div></div></body></html>`;

//   let body = `
//     <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
//     <meta content="width=device-width, initial-scale=1.0" name="viewport" />
//     <title>Document Signed Notification</title>
//     <style>
//         * {
//             box-sizing: border-box;
//         }
//         body {
//             margin: 0;
//             padding: 0;
//             background-color: #002864;
//             -webkit-text-size-adjust: none;
//             text-size-adjust: none;
//         }
//         a {
//             color: #a6dc9e;
//             text-decoration: none;
//         }
//         a:hover {
//             text-decoration: underline;
//         }
//         p {
//             line-height: 1.5;
//         }
//         .nl-container {
//             width: 100%;
//             background-color: #002864;
//         }
//         .row-content {
//             width: 680px;
//             margin: 0 auto;
//             background-color: #ffffff;
//             color: #000000;
//         }
//         .column {
//             font-weight: 400;
//             text-align: left;
//             vertical-align: top;
//             border: 0;
//         }
//         .image_block img {
//             display: block;
//             height: auto;
//             border: 0;
//             width: 100%;
//         }
//         .text_block {
//             word-break: break-word;
//         }
//         .button_block a {
//             display: inline-block;
//             padding: 10px 20px;
//             background-color: #0159C3;
//             color: #ffffff;
//             border-radius: 5px;
//             text-decoration: none;
//             font-size: 16px;
//         }
//         .button_block a:hover {
//             background-color: #0147a0;
//         }
//         .social_block .social-table {
//             display: inline-block;
//         }
//         .social_block img {
//             display: block;
//             height: 32px;
//             width: 32px;
//         }
//         @media (max-width: 700px) {
//             .row-content {
//                 width: 100% !important;
//             }
//             .stack .column {
//                 width: 100%;
//                 display: block;
//             }
//             .image_block div.fullWidth {
//                 max-width: 100% !important;
//             }
//             .text_block td.pad {
//                 padding: 15px !important;
//             }
//         }
//     </style>
// </head>
// <body>
//     <table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//         <tbody>
//             <tr>
//                 <td>
//                     <!-- Header -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 10px 0;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px 0; width: 100%;">
//                                                                 <div align="center" class="alignment" style="line-height:10px">
//                                                                     <div style="max-width: 136px;">
//                                                                         <img src=${logo} style="width: 100%;" width="136" alt="Logo" />
//                                                                     </div>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Main Content -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 20px;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 2px;">
//                                                                 <div style="font-family: system-ui, Arial, Helvetica Neue, Helvetica, sans-serif; color: #ffffff;">
//                                                                     <p style="margin: 0; font-size: 20px; text-align: left; line-height: 1.2; font-weight: 400; padding-left: 20px;">
//                                                                         Document signed successfully
//                                                                     </p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 20px;">
//                                                                 <div style="font-family: system-ui, Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 14px; color: #ffffff; line-height: 1.5;">
//                                                                     <p style="margin: 0 0 10px;">All parties have successfully signed the document <b>${pdfName}</b>. Kindly download the document from the attachment.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="button_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px; text-align: center;">
//                                                                 <a href="${url}" target="_blank">View Document</a>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Footer -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px 0;" width="100%">
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="image_block block-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 20px;">
//                                                                 <div align="center" class="alignment" style="line-height:10px">
//                                                                     <div style="max-width: 530px;">
//                                                                         <img alt="Wave decoration image" src="https://api.dev.gurujibayarea.com/media/images/waves.png" style="width: 100%;" width="530" />
//                                                                     </div>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.2; text-align: center;">
//                                                                     <p style="margin: 0;">This is an automated email from ${appName}. For any queries, please contact the sender ${sender.Email} directly.</p>
//                                                                     <p style="margin: 5px 0;">If you think this email is inappropriate or spam, you may file a complaint with ${appName} <a href="${opurl}" target="_blank">here</a>.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="social_block block-3" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div align="center" class="alignment">
//                                                                     <table border="0" cellpadding="0" cellspacing="0" class="social-table" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="108px">
//                                                                         <tr>
//                                                                             <td style="padding:0 2px;"><a href="https://www.facebook.com" target="_blank"><img alt="Facebook" src="https://api.dev.gurujibayarea.com/media/images/facebook2x.png" /></a></td>
//                                                                             <td style="padding:0 2px;"><a href="https://www.twitter.com" target="_blank"><img alt="Twitter" src="https://api.dev.gurujibayarea.com/media/images/twitter2x.png" /></a></td>
//                                                                             <td style="padding:0 2px;"><a href="https://www.linkedin.com/" target="_blank"><img alt="LinkedIn" src="https://api.dev.gurujibayarea.com/media/images/linkedin2x.png" /></a></td>
//                                                                         </tr>
//                                                                     </table>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                     <table border="0" cellpadding="0" cellspacing="0" class="text_block block-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                         <tr>
//                                                             <td class="pad" style="padding: 10px;">
//                                                                 <div style="font-family: Arial, Helvetica Neue, Helvetica, sans-serif; font-size: 12px; color: #ffffff; line-height: 1.2; text-align: center;">
//                                                                     <p style="margin: 0;">Product Developed by <a href="https://www.intuitiveapps.com" target="_blank" style="color: #a6dc9e;">Intuitive Apps Inc.</a></p>
//                                                                     <p style="margin: 0;">India | USA | Canada</p>
//                                                                     <p style="margin: 0;">Our Privacy Policy and Terms of Use.</p>
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     </table>
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                     <!-- Spacer -->
//                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                         <tbody>
//                             <tr>
//                                 <td>
//                                     <table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="680">
//                                         <tbody>
//                                             <tr>
//                                                 <td class="column column-1" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 20px 0;" width="100%">
//                                                 </td>
//                                             </tr>
//                                         </tbody>
//                                     </table>
//                                 </td>
//                             </tr>
//                         </tbody>
//                     </table>
//                 </td>
//             </tr>
//         </tbody>
//     </table>
// </body>
// </html>
//   `

  let body = `
  <!DOCTYPE html>

<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">

<head>
	<title></title>
	<meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
	<meta content="width=device-width, initial-scale=1.0" name="viewport" />
	<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
	<style>
		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
		}

		a[x-apple-data-detectors] {
			color: inherit !important;
			text-decoration: inherit !important;
		}

		#MessageViewBody a {
			color: inherit;
			text-decoration: none;
		}

		p {
			line-height: inherit
		}

		.desktop_hide,
		.desktop_hide table {
			mso-hide: all;
			display: none;
			max-height: 0px;
			overflow: hidden;
		}

		.image_block img+div {
			display: none;
		}

		.menu_block.desktop_hide .menu-links span {
			mso-hide: all;
		}

		@media (max-width:700px) {

			.desktop_hide table.icons-inner,
			.social_block.desktop_hide .social-table {
				display: inline-block !important;
			}

			.icons-inner {
				text-align: center;
			}

			.icons-inner td {
				margin: 0 auto;
			}

			.image_block div.fullWidth {
				max-width: 100% !important;
			}

			.mobile_hide {
				display: none;
			}

			.row-content {
				width: 100% !important;
			}

			.stack .column {
				width: 100%;
				display: block;
			}

			.mobile_hide {
				min-height: 0;
				max-height: 0;
				max-width: 0;
				overflow: hidden;
				font-size: 0px;
			}

			.desktop_hide,
			.desktop_hide table {
				display: table !important;
				max-height: none !important;
			}

			.row-3 .column-1 .block-1.text_block td.pad {
				padding: 0 !important;
			}

			.row-4 .column-1 .block-1.text_block td.pad {
				padding: 15px !important;
			}

			.row-4 .column-1 .block-2.text_block td.pad {
				padding: 20px !important;
			}
		}
	</style>
</head>

<body style="background-color: #cbdee9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
	<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation"
		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #cbdee9;" width="100%">
		<tbody>
			<tr>
				<td>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="0" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="padding-bottom:10px;padding-top:10px;width:100%;padding-right:0px;padding-left:0px;">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 272px;"><img
																			src="https://api.dev.instasign.ai/media/new_instasign_logo.png"
																			style="margin-left: 2rem; display: block; height: auto; border: 0; width: 100%;"
																			width="272"/></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto;"
						width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="0" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="width:100%;padding-right:0px;padding-left:0px;">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div class="fullWidth" style="max-width: 680px;">
																		<img src="https://img.freepik.com/free-vector/illustration-business-agreement-concept_53876-43724.jpg?t=st=1746689840~exp=1746693440~hmac=4867b2c277856ec8828a67b08bdf0cab9a95e999068a859dca47a9bf56763699&w=740"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			width="680" /></div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;">
																			 </p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 10px; padding-right: 10px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
																			<span style="font-size:30px;">Document Signed Successfully</span></p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="20" cellspacing="0"
														class="text_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 21px; color: #ffffff; line-height: 1.5;">
																		<p
																			style="margin: 0; font-size: 14px; text-align: justify; mso-line-height-alt: 21px;">
																			All parties have successfully signed the document "${pdfName}". Kindly download the document from the attachment.
																			</p>
															
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			This is an automated email from ${appName}. For any queries regarding this email, please contact the sender <a href="mailto:${sender.Email}" style="color: #ffffff;" target="_blank">${sender.Email}</a> directly. If you think this email is inappropriate or spam, you may file a complaint with ${appName}${opurl}.</p>
																	
                                                                        </div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="20" cellspacing="0"
														class="image_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 530px;"><img
																			alt="Wave decoration image"
																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			title="Wave decoration image" width="530" />
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
																			<span style="font-size:26px;">Thank
																				you </span></p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="20" cellspacing="0"
														class="image_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment"
																	style="line-height:10px">
																	<div style="max-width: 530px;"><img
																			alt="Wave decoration image"
																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
																			style="display: block; height: auto; border: 0; width: 100%;"
																			title="Wave decoration image" width="530" />
																	</div>
																</div>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; background-repeat: no-repeat; width: 680px; margin: 0 auto;"
										
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 0px; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<table border="0" cellpadding="10" cellspacing="0"
														class="social_block block-1" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad">
																<div align="center" class="alignment">
																	<table border="0" cellpadding="0" cellspacing="0"
																		class="social-table" role="presentation"
																		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;"
																		width="108px">
																		<tr>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.facebook.com"
																					target="_blank"><img alt="Facebook"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/facebook2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="facebook"
																						width="32" /></a></td>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.twitter.com"
																					target="_blank"><img alt="Twitter"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/twitter2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="twitter"
																						width="32" /></a></td>
																			<td style="padding:0 2px 0 2px;"><a
																					href="https://www.linkedin.com/"
																					target="_blank"><img alt="LinkedIn"
																						height="32"
																						src="https://api.dev.gurujibayarea.com/media/images/linkedin2x.png"
																						style="display: block; height: auto; border: 0;"
																						title="LinkedIn"
																						width="32" /></a></td>
																		</tr>
																	</table>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="10" cellspacing="0"
														class="text_block block-2" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
														width="100%">
														<tr>
															<td class="pad">
																<div style="font-family: sans-serif">
																	<div class=""
																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			Product Developed by <a
																				href="https://www.intuitiveapps.com"
																				rel="noopener"
																				style="text-decoration: underline; color: #a6dc9e;"
																				target="_blank"
																				title="IT Consulting & Software Development Enterprise">Intuitive
																				Apps Inc.</a></p>
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			India | USA | Canada </p>
																		<p
																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
																			Our Privacy Policy and Terms of Use. </p>
																	</div>
																</div>
															</td>
														</tr>
													</table>
													<table border="0" cellpadding="0" cellspacing="0"
														class="menu_block block-3" role="presentation"
														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
														width="100%">
														<tr>
															<td class="pad"
																style="color:#cccccc;font-family:inherit;font-size:12px;text-align:center;">
																<table border="0" cellpadding="0" cellspacing="0"
																	role="presentation"
																	style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
																	width="100%">
																	<tr>
																		<td class="alignment"
																			style="text-align:center;font-size:0px;">
																			<div class="menu-links">
																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="mailto:support@instasign.ai"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">support@instasign.ai
																				</a><!--[if mso]></td><td><![endif]--><span
																					class="sep"
																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="tel:+917011313488"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">+91
																					8130696679</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
																			</div>
																		</td>
																	</tr>
																	<tr>
																		<td class="alignment"
																			style="text-align:center;font-size:0px;">
																			<div class="menu-links">
																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="mailto:support@instasign.ai"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">USA
																				</a><!--[if mso]></td><td><![endif]--><span
																					class="sep"
																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
																					href="tel:+917011313488"
																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
																					target="_self">+1
																					4083419417</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
																			</div>
																		</td>
																	</tr>
																</table>
															</td>
														</tr>
													</table>
													<div class="spacer_block block-4"
														style="height:30px;line-height:30px;font-size:1px;"> </div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8"
						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
						<tbody>
							<tr>
								<td>
									<table align="center" border="0" cellpadding="0" cellspacing="0"
										class="row-content stack" role="presentation"
										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px; margin: 0 auto;"
										width="680">
										<tbody>
											<tr>
												<td class="column column-1"
													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
													width="100%">
													<div class="spacer_block block-1"
														style="height:20px;line-height:20px;font-size:1px;"> </div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	</table><!-- End -->
</body>

</html>
  `

  if (obj?.isCustomMail) {
    const tenant = sender?.TenantId;
    if (tenant) {
      subject = tenant?.CompletionSubject || '';
      body = tenant?.CompletionBody || '';
    } else {
      const userId = sender?.CreatedBy?.objectId || sender?.UserId?.objectId;
      if (userId) {
        try {
          const tenantQuery = new Parse.Query('partners_Tenant');
          tenantQuery.equalTo('UserId', {
            __type: 'Pointer',
            className: '_User',
            objectId: userId,
          });
          const tenantRes = await tenantQuery.first();
          if (tenantRes) {
            const _tenantRes = JSON.parse(JSON.stringify(tenantRes));
            subject = _tenantRes?.CompletionSubject || '';
            body = _tenantRes?.CompletionBody || '';
          }
        } catch (err) {
          console.log('error in fetch tenant in signpdf', err.message);
        }
      }
    }
    const expireDate = doc.ExpiryDate.iso;
    const newDate = new Date(expireDate);
    const localExpireDate = newDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const variables = {
      document_title: pdfName,
      sender_name: sender.Name,
      sender_mail: doc?.SenderMail || sender.Email,
      sender_phone: sender?.Phone || '',
      receiver_name: sender.Name,
      receiver_email: sender.Email,
      receiver_phone: sender?.Phone || '',
      expiry_date: localExpireDate,
      company_name: sender.Company,
    };
    const replaceVar = replaceMailVaribles(subject, body, variables);
    subject = replaceVar.subject;
    body = replaceVar.body;
  }
  const Bcc = doc?.Bcc?.length > 0 ? doc.Bcc.map(x => x.Email) : [];
  const updatedBcc = doc?.SenderMail ? [...Bcc, doc?.SenderMail] : Bcc;
  const params = {
    extUserId: sender.objectId,
    url: url,
    from: appName,
    replyto: doc?.ExtUserPtr?.Email || '',
    recipient: recipient,
    subject: subject,
    pdfName: pdfName,
    html: body,
    mailProvider: obj.mailProvider,
    bcc: updatedBcc?.length > 0 ? updatedBcc : '',
    certificatePath: `./exports/signed_certificate_${doc.objectId}.pdf`,
    filename: obj?.filename,
  };
  try {
    const res = await axios.post(serverUrl + '/functions/sendmailv3', params, {
      headers: {
        'Content-Type': 'application/json',
        'X-Parse-Application-Id': APPID,
        'X-Parse-Master-Key': masterKEY,
      },
    });
    // console.log('res', res.data.result);
    if (res.data?.result?.status !== 'success') {
      fs.unlinkSync(`./exports/signed_certificate_${doc.objectId}.pdf`);
    }
  } catch (err) {
    fs.unlinkSync(`./exports/signed_certificate_${doc.objectId}.pdf`);
  }
}

// `sendMailsaveCertifcate` is used send completion mail and update complete status of document
async function sendMailsaveCertifcate(doc, pfx, isCustomMail, mailProvider, filename) {
  const certificate = await GenerateCertificate(doc);
  const certificatePdf = await PDFDocument.load(certificate);
  const P12Buffer = fs.readFileSync(pfx.name);
  const p12 = new P12Signer(P12Buffer, { passphrase: pfx.passphrase || null });
  //  `pdflibAddPlaceholder` is used to add code of only digitial sign in certificate
  pdflibAddPlaceholder({
    pdfDoc: certificatePdf,
    reason: `Digitally signed by ${eSignName}.`,
    location: 'n/a',
    name: eSignName,
    contactInfo: eSigncontact,
    signatureLength: 15000,
  });
  const pdfWithPlaceholderBytes = await certificatePdf.save();
  const CertificateBuffer = Buffer.from(pdfWithPlaceholderBytes);
  //`new signPDF` create new instance of CertificateBuffer and p12Buffer
  const certificateOBJ = new SignPdf();
  // `signedCertificate` is used to sign certificate digitally
  const signedCertificate = await certificateOBJ.sign(CertificateBuffer, p12);
  const certificatePath = `./exports/signed_certificate_${doc.objectId}.pdf`;

  //below is used to save signed certificate in exports folder
  fs.writeFileSync(certificatePath, signedCertificate);
  const file = await uploadFile('certificate.pdf', certificatePath);
  const body = { CertificateUrl: file.imageUrl };
  await axios.put(serverUrl + '/classes/contracts_Document/' + doc.objectId, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': APPID,
      'X-Parse-Master-Key': masterKEY,
    },
  });
  // used in API only
  if (doc.IsSendMail === false) {
    console.log("don't send mail");
  } else {
    sendCompletedMail({ isCustomMail, doc, mailProvider, filename });
  }
  saveFileUsage(CertificateBuffer.length, file.imageUrl, doc?.CreatedBy?.objectId);
  fs.unlinkSync(pfx.name);
}
/**
 *
 * @param docId Id of Document in which user is signing
 * @param pdfFile base64 of pdfFile which you want sign
 * @returns if success {status, data} else {status, message}
 */
async function PDF(req) {
  const docId = req.params.docId;
  const randomNumber = Math.floor(Math.random() * 5000);
  const pfxname = `keystore_${randomNumber}.pfx`;
  try {
    const userIP = req.headers['x-real-ip']; // client IPaddress
    const reqUserId = req.params.userId;
    const isCustomMail = req.params.isCustomCompletionMail || false;
    const mailProvider = req.params.mailProvider || '';
    const sign = req.params.signature || '';
    // below bode is used to get info of docId
    const docQuery = new Parse.Query('contracts_Document');
    docQuery.include('ExtUserPtr,Signers,ExtUserPtr.TenantId,Bcc');
    docQuery.equalTo('objectId', docId);
    const resDoc = await docQuery.first({ useMasterKey: true });
    if (!resDoc) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Document not found.');
    }
    const IsEnableOTP = resDoc?.get('IsEnableOTP') || false;
    // if `IsEnableOTP` is false then we don't have to check authentication
    if (IsEnableOTP) {
      if (!req?.user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User is not authenticated.');
      }
    }
    const _resDoc = resDoc?.toJSON();
    let signUser;
    let className;
    // `reqUserId` is send throught pdfrequest signing flow
    if (reqUserId) {
      // to get contracts_Contactbook details for currentuser from reqUserId
      const _contractUser = _resDoc.Signers.find(x => x.objectId === reqUserId);
      if (_contractUser) {
        signUser = _contractUser;
        className = 'contracts_Contactbook';
      }
    } else {
      className = 'contracts_Users';
      signUser = _resDoc.ExtUserPtr;
    }

    const username = signUser.Name;
    const userEmail = signUser.Email;
    if (req.params.pdfFile) {
      //  `PdfBuffer` used to create buffer from pdf file
      let PdfBuffer = Buffer.from(req.params.pdfFile, 'base64');
      //  `P12Buffer` used to create buffer from p12 certificate
      let pfxFile = process.env.PFX_BASE64;
      let passphrase = process.env.PASS_PHRASE;
      if (_resDoc?.ExtUserPtr?.TenantId?.PfxFile?.base64) {
        pfxFile = _resDoc?.ExtUserPtr?.TenantId?.PfxFile?.base64;
        passphrase = _resDoc?.ExtUserPtr?.TenantId?.PfxFile?.password;
      }
      const pfx = { name: pfxname, passphrase: passphrase };
      const P12Buffer = Buffer.from(pfxFile, 'base64');
      fs.writeFileSync(pfxname, P12Buffer);
      const UserPtr = { __type: 'Pointer', className: className, objectId: signUser.objectId };
      const obj = { UserPtr: UserPtr, SignedUrl: '', Activity: 'Signed', ipAddress: userIP };
      let updateAuditTrail;
      if (_resDoc.AuditTrail && _resDoc.AuditTrail.length > 0) {
        updateAuditTrail = [..._resDoc.AuditTrail, obj];
      } else {
        updateAuditTrail = [obj];
      }

      const auditTrail = updateAuditTrail.filter(x => x.Activity === 'Signed');
      let isCompleted = false;
      if (_resDoc.Signers && _resDoc.Signers.length > 0) {
        if (auditTrail.length === _resDoc.Signers.length) {
          isCompleted = true;
        }
      } else {
        isCompleted = true;
      }
      // below regex is used to replace all word with "_" except A to Z, a to z, numbers
      const docName = _resDoc?.Name?.replace(/[^a-zA-Z0-9._-]/g, '_')?.toLowerCase();
      const filename = docName?.length > 100 ? docName?.slice(0, 100) : docName;
      const name = `${filename}_${randomNumber}.pdf`;
      let filePath = `./exports/${name}`;
      let signedFilePath = `./exports/signed_${name}`;
      let pdfSize = PdfBuffer.length;
      if (isCompleted) {
        const signersName = _resDoc.Signers?.map(x => x.Name + ' <' + x.Email + '>');
        const reason =
          signersName && signersName.length > 0
            ? signersName?.join(', ')
            : username + ' <' + userEmail + '>';
        const pdfDoc = await PDFDocument.load(PdfBuffer);
        const form = pdfDoc.getForm();
        // Updates the field appearances to ensure visual changes are reflected.
        form.updateFieldAppearances();
        // Flattens the form, converting all form fields into non-editable, static content
        form.flatten();
        const p12Cert = new P12Signer(P12Buffer, { passphrase: passphrase || null });
        signedFilePath = `./exports/signed_${name}`;
        Placeholder({
          pdfDoc: pdfDoc,
          reason: `Digitally signed by ${eSignName} for ${reason}`,
          location: 'n/a',
          name: eSignName,
          contactInfo: eSigncontact,
          signatureLength: 15000,
        });
        const pdfWithPlaceholderBytes = await pdfDoc.save();
        PdfBuffer = Buffer.from(pdfWithPlaceholderBytes);
        //`new signPDF` create new instance of pdfBuffer and p12Buffer
        const OBJ = new SignPdf();
        // `signedDocs` is used to signpdf digitally
        const signedDocs = await OBJ.sign(PdfBuffer, p12Cert);

        //`saveUrl` is used to save signed pdf in exports folder
        fs.writeFileSync(signedFilePath, signedDocs);
        pdfSize = signedDocs.length;
        console.log(`✅ PDF digitally signed created: ${signedFilePath} \n`);
      } else {
        //`saveUrl` is used to save signed pdf in exports folder
        fs.writeFileSync(signedFilePath, PdfBuffer);
        pdfSize = PdfBuffer.length;
        console.log(`New Signed PDF created called: ${signedFilePath}`);
      }

      // `uploadFile` is used to upload pdf to aws s3 and get it's url
      const data = await uploadFile(`signed_${name}`, signedFilePath);

      if (data && data.imageUrl) {
        // `axios` is used to update signed pdf url in contracts_Document classes for given DocId
        const updatedDoc = await updateDoc(
          req.params.docId, //docId
          data.imageUrl, // SignedUrl
          signUser.objectId, // userID
          userIP, // client ipAddress,
          _resDoc, // auditTrail, signers, etc data
          className, // className based on flow
          sign // sign base64
        );
        sendNotifyMail(_resDoc, signUser, mailProvider);
        saveFileUsage(pdfSize, data.imageUrl, _resDoc?.CreatedBy?.objectId);
        if (updatedDoc && updatedDoc.isCompleted) {
          const doc = { ..._resDoc, AuditTrail: updatedDoc.AuditTrail, SignedUrl: data.imageUrl };
          sendMailsaveCertifcate(doc, pfx, isCustomMail, mailProvider, `signed_${name}`);
        } else {
          // Notify the next signer when send-in-order is enabled (server-side).
          await sendNextSignerMail(
            _resDoc,
            signUser.objectId,
            updatedDoc?.AuditTrail || updateAuditTrail
          );
          if (fs.existsSync(pfxname)) {
      fs.unlinkSync(pfxname);
    }
        }
        // `fs.unlinkSync` is used to remove exported signed pdf file from exports folder
        fs.unlinkSync(signedFilePath);
        // console.log(`New Signed PDF created called: ${filePath}`);
        if (updatedDoc.message === 'success') {
          return { status: 'success', data: data.imageUrl };
        } else {
          const error = new Error('Please provide required parameters!');
          error.code = 400; // Set the error code (e.g., 400 for bad request)
          throw error;
        }
      }
    } else {
      const error = new Error('Pdf file not present!');
      error.code = 400; // Set the error code (e.g., 400 for bad request)
      throw error;
    }
  } catch (err) {
    console.log('Err in signpdf', err);
    const body = { DebugginLog: err?.message };
    try {
      await axios.put(serverUrl + '/classes/contracts_Document/' + docId, body, {
        headers: { 'X-Parse-Application-Id': APPID, 'X-Parse-Master-Key': masterKEY },
      });
    } catch (err) {
      console.log('err in saving debugginglog', err);
    }
    if (fs.existsSync(pfxname)) {
      fs.unlinkSync(pfxname);
    }
    throw err;
  }
}
export default PDF;
