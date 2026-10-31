import dotenv from 'dotenv';
// import { format, toZonedTime } from 'date-fns-tz';
import { getSignedLocalUrl } from './cloud/parsefunction/getSignedUrl.js';
import { PDFDocument } from 'pdf-lib';
import { DateTime } from 'luxon';
dotenv.config();

export const cloudServerUrl = process.env.SERVER_URL || 'https://dev.instasign.ai/app';
export const appName = 'InstaSign™';

export const color = [
  '#93a3db',
  '#e6c3db',
  '#c0e3bc',
  '#bce3db',
  '#b8ccdb',
  '#ceb8db',
  '#ffccff',
  '#99ffcc',
  '#cc99ff',
  '#ffcc99',
  '#66ccff',
  '#ffffcc',
];

export function replaceMailVaribles(subject, body, variables) {
  let replacedSubject = subject;
  let replacedBody = body;

  for (const variable in variables) {
    const regex = new RegExp(`{{${variable}}}`, 'g');
    if (subject) {
      replacedSubject = replacedSubject.replace(regex, variables[variable]);
    }
    if (body) {
      replacedBody = replacedBody.replace(regex, variables[variable]);
    }
  }
  const result = { subject: replacedSubject, body: replacedBody };
  return result;
}

export const saveFileUsage = async (size, fileUrl, userId) => {
  //checking server url and save file's size
  try {
    if (userId) {
      const tenantQuery = new Parse.Query('partners_Tenant');
      tenantQuery.equalTo('UserId', {
        __type: 'Pointer',
        className: '_User',
        objectId: userId,
      });
      const tenant = await tenantQuery.first();
      if (tenant) {
        const tenantPtr = { __type: 'Pointer', className: 'partners_Tenant', objectId: tenant.id };
        try {
          const tenantCredits = new Parse.Query('partners_TenantCredits');
          tenantCredits.equalTo('PartnersTenant', tenantPtr);
          const res = await tenantCredits.first({ useMasterKey: true });
          if (res) {
            const response = JSON.parse(JSON.stringify(res));
            const usedStorage = response?.usedStorage ? response.usedStorage + size : size;
            const updateCredit = new Parse.Object('partners_TenantCredits');
            updateCredit.id = res.id;
            updateCredit.set('usedStorage', usedStorage);
            await updateCredit.save(null, { useMasterKey: true });
          } else {
            const newCredit = new Parse.Object('partners_TenantCredits');
            newCredit.set('usedStorage', size);
            newCredit.set('PartnersTenant', tenantPtr);
            await newCredit.save(null, { useMasterKey: true });
          }
        } catch (err) {
          console.log('err in save usage', err);
        }
        saveDataFile(size, fileUrl, tenantPtr);
      }
    }
  } catch (err) {
    console.log('err in fetch tenant Id', err);
  }
};

//function for save fileUrl and file size in particular client db class partners_DataFiles
const saveDataFile = async (size, fileUrl, tenantPtr) => {
  try {
    const newDataFiles = new Parse.Object('partners_DataFiles');
    newDataFiles.set('FileUrl', fileUrl);
    newDataFiles.set('FileSize', size);
    newDataFiles.set('TenantPtr', tenantPtr);
    await newDataFiles.save(null, { useMasterKey: true });
  } catch (err) {
    console.log('error in save usage ', err);
  }
};

export const updateMailCount = async (extUserId, plan, monthchange) => {
  // Update count in contracts_Users class
  const query = new Parse.Query('contracts_Users');
  query.equalTo('objectId', extUserId);

  try {
    const contractUser = await query.first({ useMasterKey: true });
    if (contractUser) {
      const _extRes = JSON.parse(JSON.stringify(contractUser));
      let updateDate = new Date();
      if (_extRes?.LastEmailCountReset?.iso) {
        updateDate = new Date(_extRes?.LastEmailCountReset?.iso);
        const newDate = new Date();
        // Update the month while keeping the same day and year
        updateDate.setMonth(newDate.getMonth());
        updateDate.setFullYear(newDate.getFullYear());
      }
      contractUser.increment('EmailCount', 1);
      if (plan === 'freeplan') {
        if (monthchange) {
          contractUser.set('LastEmailCountReset', updateDate);
          contractUser.set('MonthlyFreeEmails', 1);
        } else {
          if (contractUser?.get('MonthlyFreeEmails')) {
            contractUser.increment('MonthlyFreeEmails', 1);
            if (contractUser?.get('LastEmailCountReset')) {
              contractUser.set('LastEmailCountReset', updateDate);
            }
          } else {
            contractUser.set('MonthlyFreeEmails', 1);
            contractUser.set('LastEmailCountReset', updateDate);
          }
        }
      }
      await contractUser.save(null, { useMasterKey: true });
    }
  } catch (error) {
    console.log('Error updating EmailCount in contracts_Users: ' + error.message);
  }
};

export function sanitizeFileName(fileName) {
  // Remove spaces and invalid characters
  const file = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
  const removedot = file.replace(/\.(?=.*\.)/g, '');
  return removedot.replace(/[^a-zA-Z0-9._-]/g, '');
}

export const useLocal = process.env.USE_LOCAL ? process.env.USE_LOCAL.toLowerCase() : 'false';
export const smtpsecure = process.env.SMTP_PORT && process.env.SMTP_PORT !== '465' ? false : true;
export const smtpenable =
  process.env.SMTP_ENABLE && process.env.SMTP_ENABLE.toLowerCase() === 'true' ? true : false;

// `generateId` is used to unique Id for fileAdapter
export function generateId(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Format date and time for the selected timezone
export const formatTimeInTimezone = (date, timezone) => {
  const nyDate = timezone ? DateTime.fromJSDate(date).setZone(timezone) : DateTime.fromJSDate(date).toUTC();
  return nyDate.toString();
};

// `getSecureUrl` is used to return local secure url if local files
export const getSecureUrl = url => {
  const fileUrl = new URL(url)?.pathname?.includes('files');
  if (fileUrl) {
    try {
      const file = getSignedLocalUrl(url);
      if (file) {
        return { url: file };
      } else {
        return { url: '' };
      }
    } catch (err) {
      console.log('err while fileupload ', err);
      return { url: '' };
    }
  } else {
    return { url: url };
  }
};

/**
 * FlattenPdf is used to remove existing widgets if present any and flatten pdf.
 * @param {string | Uint8Array | ArrayBuffer} pdfFile - pdf file.
 * @returns {Promise<Uint8Array>} flatPdf - pdf file in unit8arry
 */
export const flattenPdf = async pdfFile => {
  try {
    const pdfDoc = await PDFDocument.load(pdfFile);
    // Get the form
    const form = pdfDoc.getForm();
    // fetch form fields
    const fields = form.getFields();
    // remove form all existing fields and their widgets
    if (fields && fields?.length > 0) {
      try {
        for (const field of fields) {
          while (field.acroField.getWidgets().length) {
            field.acroField.removeWidget(0);
          }
          form.removeField(field);
        }
      } catch (err) {
        console.log('err while removing field from pdf', err);
      }
    }
    // Updates the field appearances to ensure visual changes are reflected.
    form.updateFieldAppearances();
    // Flattens the form, converting all form fields into non-editable, static content
    form.flatten();
    const flatPdf = await pdfDoc.save({ useObjectStreams: false });
    return flatPdf;
  } catch (err) {
    throw new Error('error in pdf');
  }
};

export const mailTemplate = param => {
  const themeColor = '#47a3ad';
  const subject = `${param.senderName} has requested you to sign "${param.title}"`;
  const logo = `<img src='https://qikinnovation.ams3.digitaloceanspaces.com/logo.png' height='50' />`;

  const opurl = ` <a href='https://instasign.ai' target=_blank>here</a>`;

  // const body =
  //   "<html><head><meta http-equiv='Content-Type' content='text/html;charset=UTF-8' /></head><body><div style='background-color:#f5f5f5;padding:20px'><div style='background:white;padding-bottom:20px'><div style='padding:10px'>" +
  //   logo +
  //   `</div><div style='padding:2px;font-family:system-ui;background-color:${themeColor}'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px'>Digital Signature Request</p></div><div><p style='padding:20px;font-size:14px;margin-bottom:10px'>` +
  //   param.senderName +
  //   ' has requested you to review and sign <strong>' +
  //   param.title +
  //   "</strong>.</p><div style='padding: 5px 0px 5px 25px;display:flex;flex-direction:row;justify-content:space-around'><table><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Sender</td><td></td><td style='color:#626363;font-weight:bold'>" +
  //   param.senderMail +
  //   "</td></tr><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Organization</td><td></td><td style='color:#626363;font-weight:bold'> " +
  //   param.organization +
  //   "</td></tr><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Expire on</td><td></td><td style='color:#626363;font-weight:bold'>" +
  //   param.localExpireDate +
  //   "</td></tr><tr><td></td><td></td></tr></table></div> <div style='margin-left:70px'><a target=_blank href=" +
  //   param.sigingUrl +
  //   "><button style='padding:12px;background-color:#d46b0f;color:white;border:0px;font-weight:bold;margin-top:30px'>Sign here</button></a></div><div style='display:flex;justify-content:center;margin-top:10px'></div></div></div><div><p> This is an automated email from " +
  //   appName +
  //   '. For any queries regarding this email, please contact the sender ' +
  //   param.senderMail +
  //   ` directly. If you think this email is inappropriate or spam, you may file a complaint with ${appName}${opurl}.</p></div></div></body></html>`;

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
																		<img src="https://img.freepik.com/free-vector/consent-concept-illustration_114360-9164.jpg?t=st=1746702705~exp=1746706305~hmac=de1a07689b82d0bbf58447a10dbeb0be64f5ba6227eb80d0799577f3cdf8adf3&w=740"
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
																			<span style="font-size:30px;">Document Signing Request</span></p>
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
																			"${param.senderName}" has requested you to review and sign <strong> "${param.title}" </strong>.
																			</p>
                                                                            <div style='padding: 5px 0px 5px 25px;display:flex;flex-direction:row;justify-content:space-around;'>
                                                                                <table>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Sender</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold;'>${param.senderMail}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Organization</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold'>${param.organization}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Expire on</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold'>${param.localExpireDate}</td>
                                                                                    </tr>
                                                                                </table>
                                                                            </div>

                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
															
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
                                                                            Your signature is crucial to proceed with the next steps as it signifies your agreement and authorization.
																			 </p>
                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>

                                                                            <table border="0" cellpadding="0" cellspacing="0" class="button_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                                                                                <tr>
                                                                                    <td class="pad" style="padding: 10px; text-align: center;">
                                                                                        <a href="${param.sigingUrl}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px; border: 1px solid #3e8e41; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" target="_blank">Sign Here</a>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>

                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			This is an automated email from InstaSign™. For any queries regarding this email, please contact the sender ${param.senderMail} directly. If you think this email is inappropriate or spam, you may file a complaint with InstaSign™ <a href="https://instasign.ai" style="color: #ffffff;" target="_blank">here</a>".</p>
																	
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

  return { subject, body };
};

export const selectFormat = data => {
  switch (data) {
    case 'L':
      return 'MM/dd/yyyy';
    case 'MM/DD/YYYY':
      return 'MM/dd/yyyy';
    case 'DD-MM-YYYY':
      return 'dd-MM-yyyy';
    case 'DD/MM/YYYY':
      return 'dd/MM/yyyy';
    case 'LL':
      return 'MMMM dd, yyyy';
    case 'DD MMM, YYYY':
      return 'dd MMM, yyyy';
    case 'YYYY-MM-DD':
      return 'yyyy-MM-dd';
    case 'MM-DD-YYYY':
      return 'MM-dd-yyyy';
    case 'MM.DD.YYYY':
      return 'MM.dd.yyyy';
    case 'MMM DD, YYYY':
      return 'MMM dd, yyyy';
    case 'MMMM DD, YYYY':
      return 'MMMM dd, yyyy';
    case 'DD MMMM, YYYY':
      return 'dd MMMM, yyyy';
    default:
      return 'MM/dd/yyyy';
  }
};

export function formatDateTime(date, dateFormat, timeZone, is12Hour) {
  const zonedDate = DateTime.fromJSDate(date).setZone(timeZone);
  
  // If dateFormat is a custom format with MMM, use it directly
  if (dateFormat && dateFormat.includes('MMM')) {
    return zonedDate.toFormat(dateFormat);
  }
  
  const timeFormat = is12Hour ? 'hh:mm:ss a' : 'HH:mm:ss';
  return dateFormat
    ? zonedDate.toFormat(`${selectFormat(dateFormat)}, ${timeFormat}`)
    : formatTimeInTimezone(date, timeZone);
}