import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Parse from "parse";
import "../styles/signature.css";
import { PDFDocument } from "pdf-lib";
import {
  themeColor
} from "../constant/const";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrop } from "react-dnd";
import RenderAllPdfPage from "../components/pdf/RenderAllPdfPage";
import WidgetComponent from "../components/pdf/WidgetComponent";
import Tour from "reactour";
import { useLocation, useParams } from "react-router";
import SignerListPlace from "../components/pdf/SignerListPlace";
import Header from "../components/pdf/PdfHeader";
import { RWebShare } from "react-web-share";
import {
  replaceMailVaribles,
  pdfNewWidthFun,
  contractDocument,
  contractUsers,
  addZIndex,
  randomId,
  defaultWidthHeight,
  multiSignEmbed,
  addWidgetOptions,
  textInputWidget,
  textWidget,
  radioButtonWidget,
  color,
  getTenantDetails,
  copytoData,
  convertPdfArrayBuffer,
  getContainerScale,
  convertBase64ToFile,
  onClickZoomIn,
  onClickZoomOut,
  rotatePdfPage,
  handleRemoveWidgets,
  handleRotateWarning,
  signatureTypes,
  handleSignatureType,
  getBase64FromUrl,
  generatePdfName
} from "../constant/Utils";
import RenderPdf from "../components/pdf/RenderPdf";
import { useNavigate } from "react-router";
import PlaceholderCopy from "../components/pdf/PlaceholderCopy";
import Title from "../components/Title";
import DropdownWidgetOption from "../components/pdf/DropdownWidgetOption";
import WidgetNameModal from "../components/pdf/WidgetNameModal";
import { SaveFileSize } from "../constant/saveFileSize";
import { useSelector } from "react-redux";
import PdfZoom from "../components/pdf/PdfZoom";
import { useTranslation } from "react-i18next";
import RotateAlert from "../components/RotateAlert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import TourContentWithBtn from "../primitives/TourContentWithBtn";
import HandleError from "../primitives/HandleError";
import LoaderWithMsg from "../primitives/LoaderWithMsg";
import LinkUserModal from "../primitives/LinkUserModal";
import { EmailBody } from "../components/pdf/EmailBody";
import LottieWithLoader from "../primitives/DotLottieReact";
import Alert from "../primitives/Alert";
import AsyncSelect from "react-select/async";
import AddContact from "../primitives/AddContact";
import EmptyWalletImage from "../assets/images/empty_wallet.png"; // Add the import for the image



function PlaceHolderSign() {
  const { t } = useTranslation();
  const editorRef = useRef();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [defaultBody, setDefaultBody] = useState("");
  const [defaultSubject, setDefaultSubject] = useState("");
  const [requestSubject, setRequestSubject] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [tenantMailTemplate, setTenantMailTemplate] = useState({
    body: "",
    subject: ""
  });
  const [pdfDetails, setPdfDetails] = useState([]);
  const [isMailSend, setIsMailSend] = useState(false);
  const [allPages, setAllPages] = useState(null);
  const numPages = 1;
  const [pageNumber, setPageNumber] = useState(1);
  const [signBtnPosition, setSignBtnPosition] = useState([]);
  const [xySignature, setXYSignature] = useState({});
  const [dragKey, setDragKey] = useState();
  const [signersdata, setSignersData] = useState([]);
  const [signerPos, setSignerPos] = useState([]);
  const [isSelectListId, setIsSelectId] = useState();
  const [isSendAlert, setIsSendAlert] = useState({});
  const [isSend, setIsSend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAddSigner, setIsAddSigner] = useState(false);
  const [fontSize, setFontSize] = useState();
  const [fontColor, setFontColor] = useState();
  const [isLoading, setIsLoading] = useState({
    isLoad: true,
    message: t("loading-mssg")
  });
  const [handleError, setHandleError] = useState();
  const [currentId, setCurrentId] = useState("");
  const [pdfNewWidth, setPdfNewWidth] = useState();
  const [placeholderTour, setPlaceholderTour] = useState(true);
  const [checkTourStatus, setCheckTourStatus] = useState(false);
  const [tourStatus, setTourStatus] = useState([]);
  const [signerUserId, setSignerUserId] = useState();
  const [pdfOriginalWH, setPdfOriginalWH] = useState([]);
  const [containerWH, setContainerWH] = useState();
  const { docId } = useParams();
  const divRef = useRef(null);
  const [isShowEmail, setIsShowEmail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(false);
  const [isResize, setIsResize] = useState(false);
  const [zIndex, setZIndex] = useState(1);
  const [signKey, setSignKey] = useState();
  const [tempSignerId, setTempSignerId] = useState("");
  const [blockColor, setBlockColor] = useState("");
  const [isTextSetting, setIsTextSetting] = useState(false);
  const [pdfLoad, setPdfLoad] = useState(false);
  const [isPageCopy, setIsPageCopy] = useState(false);
  const [uniqueId, setUniqueId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [isAddUser, setIsAddUser] = useState({});
  const [signerExistModal, setSignerExistModal] = useState(false);
  const [isDontShow, setIsDontShow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [widgetType, setWidgetType] = useState("");
  const [isUiLoading, setIsUiLoading] = useState(false);
  const [isRadio, setIsRadio] = useState(false);
  const [currWidgetsDetails, setCurrWidgetsDetails] = useState({});
  const [selectWidgetId, setSelectWidgetId] = useState("");
  const [isCheckbox, setIsCheckbox] = useState(false);
  const [isNameModal, setIsNameModal] = useState(false);
  const [widgetName, setWidgetName] = useState(false);
  const [mailStatus, setMailStatus] = useState("");
  const [isCurrUser, setIsCurrUser] = useState(false);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState("");
  const isHeader = useSelector((state) => state.showHeader);
  const paymentMode = useSelector((state) => state.payment.mode);
  const [showRotateAlert, setShowRotateAlert] = useState({
    status: false,
    degree: 0
  });
  const [isAlreadyPlace, setIsAlreadyPlace] = useState({
    status: false,
    message: ""
  });
  const [extUserId, setExtUserId] = useState("");
  const [isCustomize, setIsCustomize] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(0);
  const [scale, setScale] = useState(1);
  const [pdfBase64Url, setPdfBase64Url] = useState("");
  const [unSignedWidgetId, setUnSignedWidgetId] = useState("");
  const [signatureType, setSignatureType] = useState(signatureTypes);
  const [isUploadPdf, setIsUploadPdf] = useState(false);
  //'signersName' variable used to show all signer's name that do not have a signature widget assigned
  const [signersName, setSignersName] = useState("");
  const [forms, setForms] = useState([]);
  const [userList, setUserList] = useState([]);
  const [isAttchSignerModal, setIsAttchSignerModal] = useState(false);
  const [isNewContact, setIsNewContact] = useState({ status: false, id: "" });
  const isMobile = window.innerWidth < 767;
  const [walletStatus, setWalletStatus] = useState(false);
  const [, drop] = useDrop({
    accept: "BOX",
    drop: (item, monitor) => addPositionOfSignature(item, monitor),
    collect: (monitor) => ({ isOver: !!monitor.isOver() })
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false); // Add state for the wallet modal
  const [isKycRequired, setIsKycRequired] = useState(false); // Add state for KYC requirement

  const documentId = docId;
  const userEmail = localStorage.getItem('djangoUser')?.email; // Get user email from localStorage
  const token = localStorage.getItem('django'); 

  const djangoUrl = process.env.REACT_APP_DJANGO_URL;

  useEffect(() => {
    if (documentId) {
      getDocumentDetails();
    }
    if (!paymentMode) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   console.log("wallet condition", walletStatus);
  //   if (walletStatus) {
  //     console.log("this condition run");
  //     setIsWalletModalOpen(false);
  //   } else {
  //     setIsWalletModalOpen(true);
  //   }
  // }, [walletStatus]);

  useEffect(() => {
    console.log("wallet condition", walletStatus);
    if (walletStatus || paymentMode) {
      console.log("this condition run");
      setIsWalletModalOpen(false);
    } else {
      setIsWalletModalOpen(true);
    }
  }, [walletStatus, paymentMode]);



  const fetchStatus = async () => {
    try {
        const response = await axios.get(`${djangoUrl}/base/api/v1/check/activity/access/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('django')}`
            }
        });
        console.log('Status fetched:', response.data.status);
        setWalletStatus(response.data.status);
        // setWalletStatus(true);
        // Handle the response as needed
    } catch (error) {
        console.error('Error fetching status:', error);
    }
  };

  const handleAddCredits = () => {
    navigate("/wallet");
  };

  //function to fetch tenant Details
  const fetchTenantDetails = async () => {
    const user = JSON.parse(
      localStorage.getItem(
        `Parse/${localStorage.getItem("parseAppId")}/currentUser`
      )
    );
    if (user) {
      try {
        const defaultRequestBody = `<p>Hi {{receiver_name}},</p><br><p>We hope this email finds you well. {{sender_name}}&nbsp;has requested you to review and sign&nbsp;{{document_title}}.</p><p>Your signature is crucial to proceed with the next steps as it signifies your agreement and authorization.</p><br><p>{{signing_url}}</p><br><p>If you have any questions or need further clarification regarding the document or the signing process,  please contact the sender.</p><br><p>Thanks</p><p> Team InstaSign™</p><br>`;
        const defaultSubject = `{{sender_name}} has requested you to sign {{document_title}}`;
        setDefaultBody(defaultRequestBody);
        setDefaultSubject(defaultSubject);
        setRequestBody(defaultRequestBody);
        setRequestSubject(defaultSubject);
        const tenantDetails = await getTenantDetails(user?.objectId);
        if (tenantDetails && tenantDetails === "user does not exist!") {
          alert(t("user-not-exist"));
        } else if (tenantDetails) {
          const signatureType = tenantDetails?.SignatureType || [];
          const filterSignTypes = signatureType?.filter(
            (x) => x.enabled === true
          );
          if (tenantDetails?.RequestBody) {
            setRequestBody(tenantDetails?.RequestBody);
            setRequestSubject(tenantDetails?.RequestSubject);
            setTenantMailTemplate({
              body: tenantDetails?.RequestBody,
              subject: tenantDetails?.RequestSubject
            });
          }
          return filterSignTypes;
        }
      } catch (e) {
        alert(t("user-not-exist"));
      }
    } else {
      alert(t("user-not-exist"));
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (divRef.current) {
        const pdfWidth = pdfNewWidthFun(divRef);
        setPdfNewWidth(pdfWidth);
        setContainerWH({
          width: divRef.current.offsetWidth,
          height: divRef.current.offsetHeight
        });
        setScale(1);
        setZoomPercent(0);
      }
    };
    // Use setTimeout to wait for the transition to complete
    const timer = setTimeout(updateSize, 100); // match the transition duration
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divRef.current, isHeader]);
  //function for get document details
  const getDocumentDetails = async () => {
    const tenantSignTypes = await fetchTenantDetails();
    //getting document details
    const documentData = await contractDocument(documentId);
    if (documentData && documentData.length > 0) {
      // Set KYC requirement from document data
      setIsKycRequired(documentData[0]?.KycRequired || false);
      
      if (documentData[0]?.Placeholders?.length > 0) {
        const signerNotExist = documentData[0]?.Placeholders.some(
          (data) => !data.signerObjId
        );
        //condition to check any role does not attach signer
        if (signerNotExist) {
          let users = [];
          documentData[0]?.Placeholders?.forEach((element) => {
            let label = "";
            const signerData = documentData[0]?.Signers.find(
              (x) => element.signerObjId && element.signerObjId === x.objectId
            );
            if (signerData) {
              label = `${signerData.Name}<${signerData.Email}>`;
            }
            users = [
              ...users,
              {
                value: element.Id,
                label: label || "",
                role: element.Role
              }
            ];
          });
          setIsAttchSignerModal(true);
          setForms(users);
        }
      }
      const url = documentData[0] && documentData[0]?.URL;
      //convert document url in array buffer format to use embed widgets in pdf using pdf-lib
      const arrayBuffer = await convertPdfArrayBuffer(url);
      const base64Pdf = await getBase64FromUrl(url);
      if (arrayBuffer === "Error") {
        setHandleError(t("something-went-wrong-mssg"));
      } else {
        setPdfArrayBuffer(arrayBuffer);
        setPdfBase64Url(base64Pdf);
      }
      setExtUserId(documentData[0]?.ExtUserPtr?.objectId);
      const alreadyPlaceholder = documentData[0]?.SignedUrl;
      // Check if document is sent for signing
      if (alreadyPlaceholder) {
        // Check if the document is completed
        const isCompleted =
          documentData[0].IsCompleted && documentData[0]?.IsCompleted;
        // Get the expiration date of the document
        const expireDate = documentData[0].ExpiryDate.iso;
        // Check if the document has been declined
        const declined =
          documentData[0].IsDeclined && documentData[0]?.IsDeclined;
        // Get the expiration update date in milliseconds
        const expireUpdateDate = new Date(expireDate).getTime();
        // Get the current date in milliseconds
        const currDate = new Date().getTime();
        if (isCompleted) {
          // If document is completed
          setIsAlreadyPlace({
            status: true,
            message: t("document-signed-alert-5")
          });
        } else if (declined) {
          // If document has been declined
          setIsAlreadyPlace({
            status: true,
            message: t("document-signed-alert-6")
          });
        } else if (currDate > expireUpdateDate) {
          // If document has expired
          setIsAlreadyPlace({
            status: true,
            message: t("document-signed-alert-7")
          });
        } else {
          // If document is dispatched for signing
          setIsAlreadyPlace({
            status: true,
            message: t("document-signed-alert-8")
          });
        }
      }
      const userSignatureType =
        documentData[0]?.ExtUserPtr?.SignatureType || signatureTypes;
      const docSignTypes =
        documentData?.[0]?.SignatureType || userSignatureType;
      const updatedSignatureType = await handleSignatureType(
        tenantSignTypes,
        docSignTypes
      );
      setSignatureType(updatedSignatureType);
      const updatedPdfDetails = [...documentData];
      updatedPdfDetails[0].SignatureType = updatedSignatureType;
      setPdfDetails(updatedPdfDetails);
      if (documentData?.[0]?.RequestBody && documentData?.[0]?.RequestSubject) {
        setTenantMailTemplate({
          body: documentData?.[0]?.RequestBody,
          subject: documentData?.[0]?.RequestSubject
        });
      }
      //condition when placeholder have empty array with role details and signers array have signers data
      //and both array length are same
      //this case happen using placeholder form in auto save funtionality to save draft type document without adding any placehlder
      if (
        documentData[0]?.Placeholders?.length ===
        documentData[0]?.Signers?.length
      ) {
        const signersArr = documentData[0].Signers;
        const placeholder = documentData[0].Placeholders;
        const updatedSigners = signersArr.map((x, index) => ({
          ...x,
          Id: placeholder[index]?.Id,
          Role: placeholder[index]?.Role,
          blockColor: placeholder[index]?.blockColor
        }));
        setSignerPos(placeholder);
        setSignersData(updatedSigners);
        setIsSelectId(0);
        setUniqueId(placeholder[0].Id);
        setBlockColor(placeholder[0].blockColor);
      }
      //else condition when signers array have some signer's data
      //this case happen using placeholder form and load first time
      else if (documentData[0].Signers && documentData[0].Signers.length > 0) {
        const currEmail = documentData[0].ExtUserPtr.Email;
        setCurrentId(currEmail);
        setIsSelectId(0);
        //if condition when placeholder array present then update signers local array according to placeholder length
        if (
          documentData[0].Placeholders &&
          documentData[0].Placeholders.length > 0
        ) {
          setSignerPos(documentData[0].Placeholders);
          let signers = [...documentData[0].Signers];
          const placeholder = documentData[0]?.Placeholders.filter(
            (data) => data.Role !== "prefill"
          );
          let updatedSigners = placeholder.map((x) => {
            let matchingSigner = signers.find(
              (y) => x.signerObjId && x.signerObjId === y.objectId
            );
            if (matchingSigner) {
              return {
                ...matchingSigner,
                Role: x.Role ? x.Role : matchingSigner.Role,
                Id: x.Id,
                blockColor: x.blockColor
              };
            } else {
              return { Role: x.Role, Id: x.Id, blockColor: x.blockColor };
            }
          });
          setSignersData(updatedSigners);
          setUniqueId(updatedSigners[0].Id);
          setBlockColor(updatedSigners[0].blockColor);
        } else {
          //else condition when signers length present but placeholder empty then
          //update signers array with add role,id and add empty object in placeholder with signers details
          //in placeholder array
          const updatedSigners = documentData[0].Signers.map((x, index) => ({
            ...x,
            Id: randomId(),
            // Role: "User " + (index + 1),
            blockColor: color[index % color.length]
          }));
          setSignersData(updatedSigners);
          const updatedPlaceholder = documentData[0].Signers.map((x, index) => {
            return {
              // Role: updatedSigners[index].Role,
              Id: updatedSigners[index].Id,
              blockColor: color[index % color.length],
              signerPtr: {
                __type: "Pointer",
                className: x?.className || "contracts_Contactbook",
                objectId: x?.objectId
              },
              signerObjId: x?.objectId
            };
          });

          setSignerPos(updatedPlaceholder);
          setSignersData(updatedSigners);
          setUniqueId(updatedSigners[0].Id);
          setBlockColor(updatedSigners[0].blockColor);
        }
      } else {
        //when user create document using template where signers data not present and only placeholders present
        //else condition when signers array is empty then check placeholders array length
        //if placeholders have some data then update signers data according to placeholders length
        // setRoleName("User 1");
        if (
          documentData[0].Placeholders &&
          documentData[0].Placeholders.length > 0
        ) {
          const placeholder = documentData[0]?.Placeholders.filter(
            (data) => data.Role !== "prefill"
          );
          let updatedSigners = placeholder.map((x) => {
            return { Role: x.Role, Id: x.Id, blockColor: x.blockColor };
          });
          setSignerPos(documentData[0].Placeholders);
          setSignersData(updatedSigners);
          setIsSelectId(0);
          setUniqueId(updatedSigners[0].Id);
          setBlockColor(updatedSigners[0].blockColor);
        }
      }
    } else if (
      documentData === "Error: Something went wrong!" ||
      (documentData.result && documentData.result.error)
    ) {
      setHandleError(t("something-went-wrong-mssg"));
      setIsLoading({ isLoad: false });
    } else {
      setHandleError(t("no-data-avaliable"));
      setIsLoading({ isLoad: false });
    }
    const res = await contractUsers();
    if (res === "Error: Something went wrong!") {
      setHandleError(t("something-went-wrong-mssg"));
      setIsLoading({ isLoad: false });
    } else if (res.length && res[0]?.objectId) {
      setSignerUserId(res[0].objectId);
      const tourstatus = res[0].TourStatus && res[0].TourStatus;
      const alreadyPlaceholder = documentData[0]?.SignedUrl;
      if (alreadyPlaceholder) {
        setCheckTourStatus(true);
      } else if (tourstatus && tourstatus.length > 0) {
        setTourStatus(tourstatus);
        const checkTourRecipients = tourstatus.filter(
          (data) => data.placeholder
        );
        if (checkTourRecipients && checkTourRecipients.length > 0) {
          setCheckTourStatus(checkTourRecipients[0].placeholder);
        }
      }
      setIsLoading({ isLoad: false });
    } else if (res.length === 0) {
      setHandleError(t("no-data-avaliable"));
      setIsLoading({ isLoad: false });
    }
  };

  //function for setting position after drop signature button over pdf
  const addPositionOfSignature = (item, monitor) => {
    getSignerPos(item, monitor);
  };
  const getSignerPos = (item, monitor) => {
    if (uniqueId) {
      const posZIndex = zIndex + 1;
      setZIndex(posZIndex);
      const signer = signersdata.find((x) => x.Id === uniqueId);
      const key = randomId();
      const containerScale = getContainerScale(
        pdfOriginalWH,
        pageNumber,
        containerWH
      );
      let dropData = [];
      let placeHolder;
      const dragTypeValue = item?.text ? item.text : monitor.type;
      const widgetWidth =
        defaultWidthHeight(dragTypeValue).width * containerScale;
      const widgetHeight =
        defaultWidthHeight(dragTypeValue).height * containerScale;
      //adding and updating drop position in array when user drop signature button in div
      if (item === "onclick") {
        const divHeight = divRef.current.getBoundingClientRect().height;
        // `getBoundingClientRect()` is used to get accurate measurement height of the div
        const dropObj = {
          //onclick put placeholder center on pdf
          xPosition: widgetWidth / 4 + containerWH.width / 2,
          yPosition: widgetHeight + divHeight / 2,
          isStamp:
            (dragTypeValue === "stamp" || dragTypeValue === "image") && true,
          key: key,
          scale: containerScale,
          zIndex: posZIndex,
          type: dragTypeValue,
          options: addWidgetOptions(dragTypeValue),
          Width: widgetWidth / (containerScale * scale),
          Height: widgetHeight / (containerScale * scale)
        };
        dropData.push(dropObj);
        placeHolder = { pageNumber: pageNumber, pos: dropData };
      } else {
        const offset = monitor.getClientOffset();
        //This method returns the offset of the current pointer (mouse) position relative to the client viewport.
        const containerRect = document
          .getElementById("container")
          .getBoundingClientRect();
        //`containerRect.left`,  The distance from the left of the viewport to the left side of the element.
        //`containerRect.top` The distance from the top of the viewport to the top of the element.
        const x = offset.x - containerRect.left;
        const y = offset.y - containerRect.top;
        const getXPosition = signBtnPosition[0]
          ? x - signBtnPosition[0].xPos
          : x;
        const getYPosition = signBtnPosition[0]
          ? y - signBtnPosition[0].yPos
          : y;
        const dropObj = {
          xPosition: getXPosition / (containerScale * scale),
          yPosition: getYPosition / (containerScale * scale),
          isStamp:
            (dragTypeValue === "stamp" || dragTypeValue === "image") && true,
          key: key,
          scale: containerScale,
          zIndex: posZIndex,
          type: dragTypeValue,
          options: addWidgetOptions(dragTypeValue),
          Width: widgetWidth / (containerScale * scale),
          Height: widgetHeight / (containerScale * scale)
        };
        dropData.push(dropObj);
        placeHolder = { pageNumber: pageNumber, pos: dropData };
      }
      setSelectWidgetId(key);
      if (signer) {
        let filterSignerPos, currentPagePosition;
        if (dragTypeValue === textWidget) {
          filterSignerPos = signerPos.find((data) => data.Role === "prefill");
        } else {
          filterSignerPos = signerPos.find((data) => data.Id === uniqueId);
        }
        const getPlaceHolder = filterSignerPos?.placeHolder;
        if (getPlaceHolder) {
          //checking exist placeholder on same page
          currentPagePosition = getPlaceHolder.find(
            (data) => data.pageNumber === pageNumber
          );
        }
        //checking current page has already some placeholders then update that placeholder and add upcoming placehoder position
        if (getPlaceHolder && currentPagePosition) {
          const updatePlace = getPlaceHolder.filter(
            (data) => data.pageNumber !== pageNumber
          );
          const getPos = currentPagePosition?.pos;
          const newSignPos = getPos.concat(dropData);
          let xyPos = { pageNumber: pageNumber, pos: newSignPos };
          updatePlace.push(xyPos);
          let updatesignerPos;
          if (dragTypeValue === textWidget) {
            updatesignerPos = signerPos.map((x) =>
              x.Role === "prefill" ? { ...x, placeHolder: updatePlace } : x
            );
          } else {
            updatesignerPos = signerPos.map((x) =>
              x.Id === uniqueId ? { ...x, placeHolder: updatePlace } : x
            );
          }
          setSignerPos(updatesignerPos);
        } else {
          //if condition when widget type is prefill label text widget
          if (dragTypeValue === textWidget) {
            //check text widgets data (prefill) already exist then and want to add text widget on new page
            //create new page entry with old data and update placeholder
            if (filterSignerPos) {
              const addPrefillData =
                filterSignerPos && filterSignerPos?.placeHolder;
              addPrefillData.push(placeHolder);
              const updatePrefillPos = signerPos.map((x) =>
                x.Role === "prefill" ? { ...x, placeHolder: addPrefillData } : x
              );
              setSignerPos(updatePrefillPos);
            } //else condition if user do not have any text widget data
            else {
              const prefillTextWidget = {
                signerPtr: {},
                signerObjId: "",
                blockColor: "#f58f8c",
                placeHolder: [placeHolder],
                Role: "prefill",
                Id: key
              };
              setSignerPos((prev) => [...prev, prefillTextWidget]);
            }
          } else {
            //else condition to add placeholder widgets on multiple page first time
            const updatesignerPos = signerPos.map((x) =>
              x.Id === uniqueId && x?.placeHolder
                ? { ...x, placeHolder: [...x.placeHolder, placeHolder] }
                : x.Id === uniqueId
                  ? { ...x, placeHolder: [placeHolder] }
                  : x
            );
            setSignerPos(updatesignerPos);
          }
        }

        if (dragTypeValue === "dropdown") {
          setShowDropdown(true);
        } else if (dragTypeValue === "checkbox") {
          setIsCheckbox(true);
        } else if (
          [
            textInputWidget,
            textWidget,
            "name",
            "company",
            "job title",
            "email"
          ].includes(dragTypeValue)
        ) {
          setFontSize(12);
          setFontColor("black");
        } else if (dragTypeValue === radioButtonWidget) {
          setIsRadio(true);
        }
        setWidgetType(dragTypeValue);
        setSignKey(key);
        setCurrWidgetsDetails({});
        setWidgetName(dragTypeValue);
      }
    }
  };

  //function for get pdf page details
  const pageDetails = async (pdf) => {
    let pdfWHObj = [];
    const totalPages = pdf?.numPages;
    for (let index = 0; index < totalPages; index++) {
      const getPage = await pdf.getPage(index + 1);
      const scale = 1;
      const { width, height } = getPage.getViewport({ scale });
      pdfWHObj.push({ pageNumber: index + 1, width, height });
    }
    setPdfOriginalWH(pdfWHObj);
    setPdfLoad(true);
  };

  //function for save x and y position and show signature  tab on that position
  const handleTabDrag = (key) => {
    setDragKey(key);
    setIsDragging(true);
  };

  //function for set and update x and y postion after drag and drop signature tab
  const handleStop = (event, dragElement, signerId, key) => {
    setFontColor();
    setFontSize();
    if (!isResize && isDragging) {
      const dataNewPlace = addZIndex(signerPos, key, setZIndex);
      let updateSignPos = [...signerPos];
      updateSignPos.splice(0, updateSignPos.length, ...dataNewPlace);
      const signId = signerId ? signerId : uniqueId; //? signerId : signerObjId;
      const keyValue = key ? key : dragKey;
      const containerScale = getContainerScale(
        pdfOriginalWH,
        pageNumber,
        containerWH
      );
      if (keyValue >= 0) {
        let filterSignerPos;
        if (signId) {
          filterSignerPos = updateSignPos.filter((data) => data.Id === signId);
        } else {
          filterSignerPos = updateSignPos.filter(
            (data) => data.Role === "prefill"
          );
        }

        if (filterSignerPos.length > 0) {
          const getPlaceHolder = filterSignerPos[0].placeHolder;
          const getPageNumer = getPlaceHolder.filter(
            (data) => data.pageNumber === pageNumber
          );
          if (getPageNumer.length > 0) {
            const getXYdata = getPageNumer[0].pos;
            const getPosData = getXYdata;
            const addSignPos = getPosData.map((url) => {
              if (url.key === keyValue) {
                return {
                  ...url,
                  xPosition: dragElement.x / (containerScale * scale),
                  yPosition: dragElement.y / (containerScale * scale)
                };
              }
              return url;
            });

            const newUpdateSignPos = getPlaceHolder.map((obj) => {
              if (obj.pageNumber === pageNumber) {
                return { ...obj, pos: addSignPos };
              }
              return obj;
            });
            const newUpdateSigner = updateSignPos.map((obj) => {
              if (signId) {
                if (obj.Id === signId) {
                  return { ...obj, placeHolder: newUpdateSignPos };
                }
              } else {
                if (obj.Role === "prefill") {
                  return { ...obj, placeHolder: newUpdateSignPos };
                }
              }
              return obj;
            });
            setSignerPos(newUpdateSigner);
          }
        }
      }
    }
    setTimeout(() => setIsDragging(false), 200);
  };
  //function for delete signature block
  const handleDeleteSign = (key, Id) => {
    const updateData = [];
    const filterSignerPos = signerPos.filter((data) => data.Id === Id);
    if (filterSignerPos.length > 0) {
      const getPlaceHolder = filterSignerPos[0].placeHolder;
      const getPageNumer = getPlaceHolder.filter(
        (data) => data.pageNumber === pageNumber
      );
      if (getPageNumer.length > 0) {
        const getXYdata = getPageNumer[0].pos.filter(
          (data) => data.key !== key
        );
        //condition to check on same has multiple widgets so do not delete all widgets
        if (getXYdata.length > 0) {
          updateData.push(getXYdata);
          const newUpdatePos = getPlaceHolder.map((obj) => {
            if (obj.pageNumber === pageNumber) {
              return { ...obj, pos: updateData[0] };
            }
            return obj;
          });

          const newUpdateSigner = signerPos.map((obj) => {
            if (obj.Id === Id) {
              return { ...obj, placeHolder: newUpdatePos };
            }
            return obj;
          });
          setSignerPos(newUpdateSigner);
        } else {
          const getRemainPage = filterSignerPos[0].placeHolder.filter(
            (data) => data.pageNumber !== pageNumber
          );
          //condition to check placeholder length is greater than 1 do not need to remove whole placeholder
          //array only resove particular widgets
          if (getRemainPage && getRemainPage.length > 0) {
            const newUpdatePos = filterSignerPos.map((obj) => {
              if (obj.Id === Id) {
                return { ...obj, placeHolder: getRemainPage };
              }
              return obj;
            });
            let signerupdate = [];
            signerupdate = signerPos.filter((data) => data.Id !== Id);
            signerupdate.push(newUpdatePos[0]);
            setSignerPos(signerupdate);
          } else {
            const updatedData = signerPos
              .filter((item) => !(item.Id === Id && item.Role === "prefill")) // Remove prefill object
              .map((item) => {
                if (item.Id === Id && item.Role !== "prefill") {
                  // Create a copy of the item object and delete the placeHolder field
                  const updatedItem = { ...item };
                  delete updatedItem.placeHolder;
                  return updatedItem;
                }
                return item;
              });
            setSignerPos(updatedData);
          }
        }
      }
    }
  };

  //function for change page
  function changePage(offset) {
    setSignBtnPosition([]);
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  //function for capture position on hover or touch widgets
  const handleDivClick = (e) => {
    const isTouchEvent = e.type.startsWith("touch");
    const divRect = e.currentTarget.getBoundingClientRect();
    let mouseX, mouseY;
    if (isTouchEvent) {
      const touch = e.touches[0]; // Get the first touch point
      mouseX = touch.clientX - divRect.left;
      mouseY = touch.clientY - divRect.top;
      setSignBtnPosition([{ xPos: mouseX, yPos: mouseY }]);
    } else {
      mouseX = e.clientX - divRect.left;
      mouseY = e.clientY - divRect.top;
      setXYSignature({ xPos: mouseX, yPos: mouseY });
    }
  };

  //function for capture position of x and y on hover signature button last position
  const handleMouseLeave = () => {
    setSignBtnPosition([xySignature]);
  };
  //embed prefill label widget data
  const embedPrefilllData = async () => {
    const prefillExist = signerPos.filter((data) => data.Role === "prefill");
    if (prefillExist && prefillExist.length > 0) {
      const placeholder = prefillExist[0].placeHolder;
      const existingPdfBytes = pdfArrayBuffer;
      const pdfDoc = await PDFDocument.load(existingPdfBytes, {
        ignoreEncryption: true
      });
      const isSignYourSelfFlow = false;
      try {
        const pdfBase64 = await multiSignEmbed(
          placeholder,
          pdfDoc,
          isSignYourSelfFlow,
          scale
        );
        const pdfName = generatePdfName(16);
        const pdfUrl = await convertBase64ToFile(
          pdfName,
          pdfBase64,
          "",
        );
        const tenantId = localStorage.getItem("TenantId");
        const buffer = atob(pdfBase64);
        SaveFileSize(buffer.length, pdfUrl, tenantId);
        return pdfUrl;
      } catch (err) {
        console.log("error to convertBase64ToFile in placeholder flow", err);
        alert(err?.message);
      }
    } else if (pdfBase64Url) {
      try {
        const pdfName = generatePdfName(16);
        const pdfUrl = await convertBase64ToFile(
          pdfName,
          pdfBase64Url,
          "",
        );
        return pdfUrl;
      } catch (err) {
        console.log("error to convertBase64ToFile in placeholder flow", err);
        alert(err?.message);
      }
    } else {
      return pdfDetails[0].URL;
    }
  };
  const alertSendEmail = async () => {
    const filterPrefill = signerPos?.filter((data) => data.Role !== "prefill");
    const getPrefill = signerPos?.find((data) => data.Role === "prefill");
    //unassigned signature widgets signer's list
    let unassignedWidget = [];
    let isLabel = false;
    let unfilledTextWidgetId = "";
    //checking all signers placeholder exist or not
    const isPlaceholderExist = filterPrefill.every((data) => data.placeHolder);
    const prefillPlaceholder = getPrefill?.placeHolder;
    //condition is used to check text widget data is empty or have response
    if (getPrefill) {
      if (prefillPlaceholder) {
        prefillPlaceholder.map((data) => {
          if (!isLabel) {
            const unfilledTextWidgets = data.pos.find(
              (position) => !position.options.response
            );
            if (unfilledTextWidgets) {
              isLabel = true;
              unfilledTextWidgetId = unfilledTextWidgets.key;
            }
          }
        });
      }
    }

    //for loop is used to check signature widget exist or not
    //if signature widget does not exist then show tour messages on signature widgets
    //and show list of signers who need to add signature widget
    for (let item of filterPrefill) {
      let signatureExist = false; // Reset for each iteration
      //condition if placeholder filed exist then check which signer do not have signature widget
      if (item.placeHolder) {
        for (let x of item.placeHolder) {
          if (!signatureExist) {
            signatureExist = x.pos.some((data) => data?.type === "signature");
          }
        }
        if (!signatureExist) {
          unassignedWidget.push(item);
        }
      } else {
        //condition if placeholder filed does not exist then it means there are no any signature widget for any signer
        unassignedWidget.push(item);
      }
    }
    //checking if there are any signer list which do not have signture widget then show signers name on tour messages
    if (unassignedWidget.length > 0) {
      const getSigner = unassignedWidget.map((x) => {
        return signersdata.find((y) => y.Id === x.Id).Name;
      });
      const signersName = getSigner.join(", ");
      setSignersName(signersName);
      setIsSendAlert({ mssg: "sure", alert: true });
      return; // Exit early if there are unassigned widgets
    }

    if (getPrefill && isLabel) {
      setIsSendAlert({ mssg: textWidget, alert: true });
      setUnSignedWidgetId(unfilledTextWidgetId);
      return; // Exit early if there are unfilled text widgets
    } 
    
    if (isPlaceholderExist && unassignedWidget.length === 0) {
      const IsSignerNotExist = filterPrefill?.filter((x) => !x.signerObjId);
      if (IsSignerNotExist && IsSignerNotExist?.length > 0) {
        setSignerExistModal(true);
        setSelectWidgetId(IsSignerNotExist[0]?.placeHolder?.[0]?.pos?.[0]?.key);
        return; // Exit early if there are signers without object IDs
      }
      
      // Extract signer emails and document ID for API call
      const signerEmails = signersdata
        .filter((signer) => signer.Role !== "prefill")
        .map((signer) => signer.Email)
        .join(",");

        // const signerEmails = signersdata.filter((signer) => signer.Role !== "prefill");
      
      // Create the document only after /signed/document succeeds
      try {
        const response = await axios.post(`${djangoUrl}/base/api/v1/signed/document/`, {
          signers: signerEmails,
          document_id: documentId
        }, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("django")}`
          }
        });

        const isSuccess = response.status >= 200 && response.status < 300;
        if (!isSuccess) {
          console.error('Error response from signed document API:', response.data);
          alert(t("something-went-wrong-mssg"));
          return;
        }

        saveDocumentDetails();
      } catch (error) {
        console.error('Error calling signed document API:', error);
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.response?.data?.error;
        alert(apiMessage || t("something-went-wrong-mssg"));
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!pdfDetails?.[0]?.IsCompleted) {
        autosavedetails();
      }
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signerPos, signersdata, signatureType, pdfBase64Url]);

  // `autosavedetails` is used to save doc details after every 2 sec when changes are happern in placeholder like drag-drop widgets, remove signers
  const autosavedetails = async () => {
    const signers = signersdata?.reduce((acc, x) => {
      if (x.objectId) {
        acc.push({
          __type: "Pointer",
          className: "contracts_Contactbook",
          objectId: x.objectId
        });
      }
      return acc;
    }, []);
    let pdfUrl;
    if (isUploadPdf) {
      const pdfName = generatePdfName(16);
      pdfUrl = await convertBase64ToFile(
        pdfName,
        pdfBase64Url,
        "",
      );
    }
    try {
      const docCls = new Parse.Object("contracts_Document");
      docCls.id = documentId;
      if (signerPos?.length > 0) {
        docCls.set("Placeholders", signerPos);
      }
      docCls.set("Signers", signers);
      docCls.set("SignatureType", signatureType);
      if (pdfUrl) {
        docCls.set("URL", pdfUrl);
      }
      const res = await docCls.save();
      if (res) {
        pdfDetails[0] = { ...pdfDetails[0], URL: pdfUrl };
      }
    } catch (e) {
      console.log("error", e);
      alert(t("something-went-wrong-mssg"));
    }
  };
  //function to use save placeholder details in contracts_document
  const saveDocumentDetails = async () => {
    setIsUiLoading(true);
    let signerMail = signersdata.slice();
    if (pdfDetails?.[0]?.SendinOrder && pdfDetails?.[0]?.SendinOrder === true) {
      signerMail.splice(1);
    }
    const pdfUrl = await embedPrefilllData();
    if (pdfUrl) {
      const signers = signersdata?.map((x) => {
        return {
          __type: "Pointer",
          className: "contracts_Contactbook",
          objectId: x.objectId
        };
      });
      const addExtraDays = pdfDetails[0]?.TimeToCompleteDays
        ? pdfDetails[0].TimeToCompleteDays
        : 15;
      const currentUser = signersdata.find((x) => x.Email === currentId);
      setCurrentId(currentUser?.objectId);
      if (
        pdfDetails?.[0]?.SendinOrder &&
        pdfDetails?.[0]?.SendinOrder === true
      ) {
        const currentUserMail = Parse.User.current()?.getEmail();
        const isCurrentUser = signerMail?.[0]?.Email === currentUserMail;
        setIsCurrUser(isCurrentUser);
      } else {
        setIsCurrUser(currentUser?.objectId ? true : false);
      }
      let updateExpiryDate, data;
      updateExpiryDate = new Date();
      updateExpiryDate.setDate(updateExpiryDate.getDate() + addExtraDays);
      //filter label widgets after add label widgets data on pdf
      const filterPrefill = signerPos.filter((data) => data.Role !== "prefill");
      try {
        data = {
          Placeholders: filterPrefill,
          SignedUrl: pdfUrl,
          Signers: signers,
          SentToOthers: true,
          SignatureType: pdfDetails?.[0]?.SignatureType
        };
        if (updateExpiryDate) {
          data["ExpiryDate"] = { iso: updateExpiryDate, __type: "Date" };
        }
        await axios
          .put(
            `${localStorage.getItem(
              "baseUrl"
            )}classes/contracts_Document/${documentId}`,
            data,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Parse-Application-Id": localStorage.getItem("parseAppId"),
                "X-Parse-Session-Token": localStorage.getItem("accesstoken")
              }
            }
          )
          .then(() => {
            setIsMailSend(true);
            setIsLoading({ isLoad: false });
            setIsUiLoading(false);
            setSignerPos([]);
            setIsSendAlert({ mssg: "confirm", alert: true });
          })
          .catch((err) => {
            console.log("axois err ", err);
            alert(t("something-went-wrong-mssg"));
          });
      } catch (e) {
        console.log("error", e);
        alert(t("something-went-wrong-mssg"));
      }
    } else {
      setIsUiLoading(false);
    }
  };

  const copytoclipboard = (text) => {
    copytoData(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // Reset copied state after 1.5 seconds
  };
  //function show signer list and share link to share signUrl
  const handleShareList = () => {
    const shareLinkList = [];
    let signerMail = signersdata;
    for (let i = 0; i < signerMail.length; i++) {
      const objectId = signerMail[i].objectId;
      const hostUrl = window.location.origin;
      const sendMail = false;
      //encode this url value `${pdfDetails?.[0].objectId}/${signerMail[i].Email}/${objectId}` to base64 using `btoa` function
      const encodeBase64 = btoa(
        `${pdfDetails?.[0].objectId}/${signerMail[i].Email}/${objectId}/${sendMail}`
      );
      let signPdf = `${hostUrl}/login/${encodeBase64}`;
      shareLinkList.push({ signerEmail: signerMail[i].Email, url: signPdf });
    }
    return shareLinkList.map((data, ind) => {
      return (
        <div
          className="flex flex-row justify-between items-center mb-1"
          key={ind}
        >
          {copied && <Alert type="success">{t("copied")}</Alert>}
          <span className="w-[220px] md:w-[300px] whitespace-nowrap overflow-hidden text-ellipsis  ">
            {data.signerEmail}
          </span>
          <div className="flex flex-row items-center gap-3 ">
            <button
              onClick={() => copytoclipboard(data.url)}
              type="button"
              className="flex flex-row items-center op-link op-link-primary"
            >
              <i className="fa-light fa-copy" />
              <span className=" hidden md:block ml-1 ">{t("copy-link")}</span>
            </button>
            <RWebShare data={{ url: data.url, title: t("sign-url") }}>
              <i className="fa-light fa-share-from-square op-link op-link-secondary no-underline"></i>
            </RWebShare>
          </div>
        </div>
      );
    });
  };
  const sendEmailToSigners = async () => {
    let htmlReqBody;
    setIsUiLoading(true);
    setIsSendAlert({});
    let sendMail;
    const expireDate = pdfDetails?.[0].ExpiryDate.iso;
    const newDate = new Date(expireDate);
    const localExpireDate = newDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    let senderEmail = pdfDetails?.[0]?.ExtUserPtr?.Email;
    let senderPhone = pdfDetails?.[0]?.ExtUserPtr?.Phone;
    let signerMail = signersdata.slice();

    if (pdfDetails?.[0]?.SendinOrder && pdfDetails?.[0]?.SendinOrder === true) {
      signerMail.splice(1);
    }

    for (let i = 0; i < signerMail.length; i++) {
      try {
        const imgPng =
          "https://qikinnovation.ams3.digitaloceanspaces.com/logo.png";
        let url = `${localStorage.getItem("baseUrl")}functions/sendmailv3`;
        const headers = {
          "Content-Type": "application/json",
          "X-Parse-Application-Id": localStorage.getItem("parseAppId"),
          sessionToken: localStorage.getItem("accesstoken")
        };
        const objectId = signerMail[i].objectId;
        const hostUrl = window.location.origin;
        //encode this url value `${pdfDetails?.[0].objectId}/${signerMail[i].Email}/${objectId}` to base64 using `btoa` function
        const encodeBase64 = btoa(
          `${pdfDetails?.[0].objectId}/${signerMail[i].Email}/${objectId}`
        );
        let signPdf = `${hostUrl}/login/${encodeBase64}`;
        const openSignUrl = `${hostUrl}`;
        const orgName = pdfDetails[0]?.ExtUserPtr.Company
          ? pdfDetails[0].ExtUserPtr.Company
          : "";
        const themeBGcolor = themeColor;
        const senderName = `${pdfDetails?.[0].ExtUserPtr.Name}`;
        const documentName = `${pdfDetails?.[0].Name}`;
        let replaceVar;

        if (
          requestBody &&
          requestSubject &&
          isCustomize
        ) {
          const replacedRequestBody = requestBody.replace(/"/g, "'");
          htmlReqBody =
            "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body>" +
            replacedRequestBody +
            "</body> </html>";

          const variables = {
            document_title: documentName,
            sender_name:
              senderName,
            sender_mail:
              senderEmail,
            sender_phone: senderPhone || "",
            receiver_name: signerMail[i]?.Name || "",
            receiver_email: signerMail[i].Email,
            receiver_phone: signerMail[i]?.Phone || "",
            expiry_date: localExpireDate,
            company_name: orgName,
            signing_url: `<a href=${signPdf} target=_blank>Sign here</a>`
          };
          replaceVar = replaceMailVaribles(
            requestSubject,
            htmlReqBody,
            variables
          );
        } else if (
          tenantMailTemplate?.body &&
          tenantMailTemplate?.subject
        ) {
          const mailBody = tenantMailTemplate?.body;
          const mailSubject = tenantMailTemplate?.subject;
          const replacedRequestBody = mailBody.replace(/"/g, "'");
          const htmlReqBody =
            "<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body>" +
            replacedRequestBody +
            "</body> </html>";
          const variables = {
            document_title: documentName,
            sender_name:
              senderName,
            sender_mail:
              senderEmail,
            sender_phone: senderPhone || "",
            receiver_name: signerMail[i]?.Name || "",
            receiver_email: signerMail[i].Email,
            receiver_phone: signerMail[i]?.Phone || "",
            expiry_date: localExpireDate,
            company_name: orgName,
            signing_url: `<a href=${signPdf} target=_blank>Sign here</a>`
          };
          replaceVar = replaceMailVaribles(mailSubject, htmlReqBody, variables);
        }
        let params = {
          extUserId: extUserId,
          recipient: signerMail[i].Email,
          subject: replaceVar?.subject
            ? replaceVar?.subject
            : `Your ${documentName} is Ready – Please Review & Sign`,
          replyto:
            senderEmail ||
            "",
          from:
            senderEmail,
          html: replaceVar?.body
            ? replaceVar?.body :
            // : "<html><head><meta http-equiv='Content-Type' content='text/html;charset=UTF-8' /></head><body><div style='background-color:#f5f5f5; padding:20px;'><div style='box-shadow:rgba(0, 0, 0, 0.1) 0px 4px 12px;background:white;padding-bottom:20px;'><div style='padding:10px 10px 0 10px'><img src=" +
            //   imgPng +
            //   " height='50' style='padding:20px,width:170px,height:40px' /></div><div style='padding:2px;font-family:system-ui;background-color:" +
            //   themeBGcolor +
            //   ";'><p style='font-size:20px;font-weight:400;color:white;padding-left:20px;' > Digital Signature Request</p></div><div><p style='padding:20px;font-family:system-ui;font-size:14px;margin-bottom:10px;'> " +
            //   pdfDetails?.[0].ExtUserPtr.Name +
            //   " has requested you to review and sign <strong> " +
            //   pdfDetails?.[0].Name +
            //   "</strong>.</p><div style='padding: 5px 0px 5px 25px;display:flex;flex-direction:row;justify-content:space-around;'><table><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Sender</td><td></td><td style='color:#626363;font-weight:bold;'>" +
            //   senderEmail +
            //   "</td></tr><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Organization</td><td></td><td style='color:#626363;font-weight:bold'> " +
            //   orgName +
            //   "</td></tr><tr><td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Expire on</td><td></td><td style='color:#626363;font-weight:bold'>" +
            //   localExpireDate +
            //   "</td></tr><tr><td></td><td></td></tr></table></div> <div style='margin-left:70px'><a target=_blank href=" +
            //   signPdf +
            //   "><button style='padding: 12px 12px 12px 12px;background-color:#d46b0f;color:white;border:0px;box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px,rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;font-weight:bold;margin-top:30px'>Sign here</button></a></div><div style='display: flex; justify-content: center;margin-top: 10px;'></div></div></div><div><p> This is an automated email from InstaSign™. For any queries regarding this email, please contact the sender " +
            //   senderEmail +
            //   " directly.If you think this email is inappropriate or spam, you may file a complaint with InstaSign™ <a href= " +
            //   openSignUrl +
            //   " target=_blank>here</a>.</p></div></div></body></html>"

            // Need to Change on monday
//             ` <!DOCTYPE html>

// <html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">

// <head>
// 	<title></title>
// 	<meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
// 	<meta content="width=device-width, initial-scale=1.0" name="viewport" />
// 	<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
// 	<style>
// 		* {
// 			box-sizing: border-box;
// 		}

// 		body {
// 			margin: 0;
// 			padding: 0;
// 		}

// 		a[x-apple-data-detectors] {
// 			color: inherit !important;
// 			text-decoration: inherit !important;
// 		}

// 		#MessageViewBody a {
// 			color: inherit;
// 			text-decoration: none;
// 		}

// 		p {
// 			line-height: inherit
// 		}

// 		.desktop_hide,
// 		.desktop_hide table {
// 			mso-hide: all;
// 			display: none;
// 			max-height: 0px;
// 			overflow: hidden;
// 		}

// 		.image_block img+div {
// 			display: none;
// 		}

// 		.menu_block.desktop_hide .menu-links span {
// 			mso-hide: all;
// 		}

// 		@media (max-width:700px) {

// 			.desktop_hide table.icons-inner,
// 			.social_block.desktop_hide .social-table {
// 				display: inline-block !important;
// 			}

// 			.icons-inner {
// 				text-align: center;
// 			}

// 			.icons-inner td {
// 				margin: 0 auto;
// 			}

// 			.image_block div.fullWidth {
// 				max-width: 100% !important;
// 			}

// 			.mobile_hide {
// 				display: none;
// 			}

// 			.row-content {
// 				width: 100% !important;
// 			}

// 			.stack .column {
// 				width: 100%;
// 				display: block;
// 			}

// 			.mobile_hide {
// 				min-height: 0;
// 				max-height: 0;
// 				max-width: 0;
// 				overflow: hidden;
// 				font-size: 0px;
// 			}

// 			.desktop_hide,
// 			.desktop_hide table {
// 				display: table !important;
// 				max-height: none !important;
// 			}

// 			.row-3 .column-1 .block-1.text_block td.pad {
// 				padding: 0 !important;
// 			}

// 			.row-4 .column-1 .block-1.text_block td.pad {
// 				padding: 15px !important;
// 			}

// 			.row-4 .column-1 .block-2.text_block td.pad {
// 				padding: 20px !important;
// 			}
// 		}
// 	</style>
// </head>

// <body style="background-color: #cbdee9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
// 	<table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation"
// 		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #cbdee9;" width="100%">
// 		<tbody>
// 			<tr>
// 				<td>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="0" cellspacing="0"
// 														class="image_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad"
// 																style="padding-bottom:10px;padding-top:10px;width:100%;padding-right:0px;padding-left:0px;">
// 																<div align="center" class="alignment"
// 																	style="line-height:10px">
// 																	<div style="max-width: 272px;"><img
// 																			src="https://api.dev.instasign.ai/media/new_instasign_logo.png"
// 																			style="margin-left: 1.5rem; display: block; height: auto; border: 0; width: 100%;"
// 																			width="272"/></div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto;"
// 						width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-size: auto; background-color: #ffffff; border-radius: 0; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: middle; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="0" cellspacing="0"
// 														class="image_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad"
// 																style="width:100%;padding-right:0px;padding-left:0px;">
// 																<div align="center" class="alignment"
// 																	style="line-height:10px">
// 																	<div class="fullWidth" style="max-width: 680px;">
// 																		<img src="https://img.freepik.com/free-vector/consent-concept-illustration_114360-9164.jpg?t=st=1746702705~exp=1746706305~hmac=de1a07689b82d0bbf58447a10dbeb0be64f5ba6227eb80d0799577f3cdf8adf3&w=740"
// 																			style="display: block; height: auto; border: 0; width: 100%;"
// 																			width="680" /></div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-3"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="10" cellspacing="0"
// 														class="text_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div style="font-family: sans-serif">
// 																	<div class=""
// 																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
// 																		<p
// 																			style="margin: 0; font-size: 12px; mso-line-height-alt: 14.399999999999999px;">
// 																			 </p>
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-4"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-left: 10px; padding-right: 10px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="10" cellspacing="0"
// 														class="text_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div style="font-family: sans-serif">
// 																	<div class=""
// 																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
// 																		<p
// 																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
// 																			<span style="font-size:30px;">Document Signing Request</span></p>
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 													<table border="0" cellpadding="20" cellspacing="0"
// 														class="text_block block-2" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div style="font-family: sans-serif">
// 																	<div class=""
// 																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 21px; color: #ffffff; line-height: 1.5;">
//                                                                         <p
// 																			style="margin: 0; font-size: 14px; text-align: justify; mso-line-height-alt: 21px;">
// 																			"${pdfDetails?.[0].ExtUserPtr.Name}" has requested you to review and sign <strong> "${pdfDetails?.[0].Name}" </strong>.
// 																			</p>
//                                                                             <div style='padding: 5px 0px 5px 25px;display:flex;flex-direction:row;justify-content:space-around;'>
//                                                                                 <table>
//                                                                                     <tr>
//                                                                                         <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Sender</td>
//                                                                                         <td></td>
//                                                                                         <td style='color:#ffffff;font-weight:bold;'><span style="color:#ffffff !important;text-decoration:none;">${senderEmail}</span></td>
//                                                                                     </tr>
//                                                                                     <tr>
//                                                                                         <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Organization</td>
//                                                                                         <td></td>
//                                                                                         <td style='color:#ffffff;font-weight:bold'>${orgName}</td>
//                                                                                     </tr>
//                                                                                     <tr>
//                                                                                         <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Expire on</td>
//                                                                                         <td></td>
//                                                                                         <td style='color:#ffffff;font-weight:bold'>${localExpireDate}</td>
//                                                                                     </tr>
//                                                                                 </table>
//                                                                             </div>

//                                                                             <p
// 																			style="margin: 0; mso-line-height-alt: 21px;">
// 																			 </p>
															
// 																		<p
// 																			style="margin: 0; mso-line-height-alt: 21px;">
//                                                                             Your signature is crucial to proceed with the next steps as it signifies your agreement and authorization.
// 																			 </p>
//                                                                             <p
// 																			style="margin: 0; mso-line-height-alt: 21px;">
// 																			 </p>

//                                                                             <table border="0" cellpadding="0" cellspacing="0" class="button_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
//                                                                                 <tr>
//                                                                                     <td class="pad" style="padding: 10px; text-align: center;">
//                                                                                         <a href="${signPdf}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px; border: 1px solid #3e8e41; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" target="_blank">Sign Here</a>
//                                                                                     </td>
//                                                                                 </tr>
//                                                                             </table>

//                                                                             <p
// 																			style="margin: 0; mso-line-height-alt: 21px;">
// 																			 </p>
// 																		<p
// 																			style="margin: 0; mso-line-height-alt: 21px;">
// 																			This is an automated email from InstaSign™. For any queries regarding this email, please contact the sender <span style="color:#ffffff !important;text-decoration:none;">${senderEmail}</span> directly. If you think this email is inappropriate or spam, you may file a complaint with InstaSign™ <a href="https://instasign.ai" style="color: #ffffff;" target="_blank">here</a>".</p>
																	
//                                                                         </div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
                                                    
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-5"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="20" cellspacing="0"
// 														class="image_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div align="center" class="alignment"
// 																	style="line-height:10px">
// 																	<div style="max-width: 530px;"><img
// 																			alt="Wave decoration image"
// 																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
// 																			style="display: block; height: auto; border: 0; width: 100%;"
// 																			title="Wave decoration image" width="530" />
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-6"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="10" cellspacing="0"
// 														class="text_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div style="font-family: sans-serif">
// 																	<div class=""
// 																		style="font-size: 14px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 16.8px; color: #ffffff; line-height: 1.2;">
// 																		<p
// 																			style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 16.8px;">
// 																			<span style="font-size:26px;">Thank
// 																				you </span></p>
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 													<table border="0" cellpadding="20" cellspacing="0"
// 														class="image_block block-2" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div align="center" class="alignment"
// 																	style="line-height:10px">
// 																	<div style="max-width: 530px;"><img
// 																			alt="Wave decoration image"
// 																			src="https://api.dev.gurujibayarea.com/media/images/waves.png"
// 																			style="display: block; height: auto; border: 0; width: 100%;"
// 																			title="Wave decoration image" width="530" />
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-7"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #002864; color: #000000; background-repeat: no-repeat; width: 680px; margin: 0 auto;"
										
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 0px; padding-top: 15px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<table border="0" cellpadding="10" cellspacing="0"
// 														class="social_block block-1" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div align="center" class="alignment">
// 																	<table border="0" cellpadding="0" cellspacing="0"
// 																		class="social-table" role="presentation"
// 																		style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; display: inline-block;"
// 																		width="108px">
// 																		<tr>
// 																			<td style="padding:0 2px 0 2px;"><a
// 																					href="https://www.facebook.com"
// 																					target="_blank"><img alt="Facebook"
// 																						height="32"
// 																						src="https://api.dev.gurujibayarea.com/media/images/facebook2x.png"
// 																						style="display: block; height: auto; border: 0;"
// 																						title="facebook"
// 																						width="32" /></a></td>
// 																			<td style="padding:0 2px 0 2px;"><a
// 																					href="https://www.twitter.com"
// 																					target="_blank"><img alt="Twitter"
// 																						height="32"
// 																						src="https://api.dev.gurujibayarea.com/media/images/twitter2x.png"
// 																						style="display: block; height: auto; border: 0;"
// 																						title="twitter"
// 																						width="32" /></a></td>
// 																			<td style="padding:0 2px 0 2px;"><a
// 																					href="https://www.linkedin.com/"
// 																					target="_blank"><img alt="LinkedIn"
// 																						height="32"
// 																						src="https://api.dev.gurujibayarea.com/media/images/linkedin2x.png"
// 																						style="display: block; height: auto; border: 0;"
// 																						title="LinkedIn"
// 																						width="32" /></a></td>
// 																		</tr>
// 																	</table>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 													<table border="0" cellpadding="10" cellspacing="0"
// 														class="text_block block-2" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;"
// 														width="100%">
// 														<tr>
// 															<td class="pad">
// 																<div style="font-family: sans-serif">
// 																	<div class=""
// 																		style="font-size: 12px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #ffffff; line-height: 1.2;">
// 																		<p
// 																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
// 																			Product Developed by <a
// 																				href="https://www.intuitiveapps.com"
// 																				rel="noopener"
// 																				style="text-decoration: underline; color: #a6dc9e;"
// 																				target="_blank"
// 																				title="IT Consulting & Software Development Enterprise">Intuitive
// 																				Apps Inc.</a></p>
// 																		<p
// 																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
// 																			India | USA | Canada </p>
// 																		<p
// 																			style="margin: 0; text-align: center; mso-line-height-alt: 14.399999999999999px;">
// 																			Our Privacy Policy and Terms of Use. </p>
// 																	</div>
// 																</div>
// 															</td>
// 														</tr>
// 													</table>
// 													<table border="0" cellpadding="0" cellspacing="0"
// 														class="menu_block block-3" role="presentation"
// 														style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 														width="100%">
// 														<tr>
// 															<td class="pad"
// 																style="color:#cccccc;font-family:inherit;font-size:12px;text-align:center;">
// 																<table border="0" cellpadding="0" cellspacing="0"
// 																	role="presentation"
// 																	style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;"
// 																	width="100%">
// 																	<tr>
// 																		<td class="alignment"
// 																			style="text-align:center;font-size:0px;">
// 																			<div class="menu-links">
// 																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
// 																					href="mailto:support@instasign.ai"
// 																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
// 																					target="_self">support@instasign.ai
// 																				</a><!--[if mso]></td><td><![endif]--><span
// 																					class="sep"
// 																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
// 																					href="tel:+918130696679"
// 																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
// 																					target="_self">+91
// 																					8130696679</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
// 																			</div>
// 																		</td>
// 																	</tr>
//                                   <tr>
// 																		<td class="alignment"
// 																			style="text-align:center;font-size:0px;">
// 																			<div class="menu-links">
// 																				<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style=""><tr style="text-align:center;"><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
// 																					href="mailto:support@instasign.ai"
// 																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
// 																					target="_self">USA
// 																				</a><!--[if mso]></td><td><![endif]--><span
// 																					class="sep"
// 																					style="font-size:12px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;color:#cccccc;">|</span><!--[if mso]></td><![endif]--><!--[if mso]><td style="padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px"><![endif]--><a
// 																					href="tel:+14083419417"
// 																					style="mso-hide:false;padding-top:5px;padding-bottom:5px;padding-left:5px;padding-right:5px;display:inline-block;color:#a6dc9e;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;font-size:12px;text-decoration:none;letter-spacing:normal;"
// 																					target="_self">+1
// 																					4083419417</a><!--[if mso]></td><![endif]--><!--[if mso]></tr></table><![endif]-->
// 																			</div>
// 																		</td>
// 																	</tr>
// 																</table>
// 															</td>
// 														</tr>
// 													</table>
// 													<div class="spacer_block block-4"
// 														style="height:30px;line-height:30px;font-size:1px;"> </div>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 					<table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-8"
// 						role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
// 						<tbody>
// 							<tr>
// 								<td>
// 									<table align="center" border="0" cellpadding="0" cellspacing="0"
// 										class="row-content stack" role="presentation"
// 										style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 680px; margin: 0 auto;"
// 										width="680">
// 										<tbody>
// 											<tr>
// 												<td class="column column-1"
// 													style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;"
// 													width="100%">
// 													<div class="spacer_block block-1"
// 														style="height:20px;line-height:20px;font-size:1px;"> </div>
// 												</td>
// 											</tr>
// 										</tbody>
// 									</table>
// 								</td>
// 							</tr>
// 						</tbody>
// 					</table>
// 				</td>
// 			</tr>
// 		</tbody>
// 	</table><!-- End -->
// </body>

// </html>
                          
                          
//             `
            `
                          
                          
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
																			"${pdfDetails?.[0].ExtUserPtr.Name}" has requested you to review and sign <strong> "${pdfDetails?.[0].Name}" </strong>.
																			</p>
                                                                            <div style='padding: 5px 0px 5px 25px;display:flex;flex-direction:row;justify-content:space-around;'>
                                                                                <table>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Sender</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold;'><span style="color:#ffffff !important;text-decoration:none;">${senderEmail}</span></td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Organization</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold'>Intuitive Apps India Private Limited</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td style='font-weight:bold;font-family:sans-serif;font-size:15px'>Expire on</td>
                                                                                        <td></td>
                                                                                        <td style='color:#ffffff;font-weight:bold'>${localExpireDate}</td>
                                                                                    </tr>
                                                                                </table>
                                                                            </div>

                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
															
																		<p
																			style="margin: 0; mso-line-height-alt: 21px;">
                                                                            Your dedication, hard work, and valuable contributions have made a meaningful impact on our success. We sincerely appreciate your commitment and look forward to your continued excellence in the journey ahead.
																			 </p>
																			 
																			 
																		
																			 
																			 <p
																			style="margin: 0; mso-line-height-alt: 21px;">
                                                                            Your signature is crucial to proceed with the next steps as it signifies your agreement and authorization. Please ensure the document is signed within 3 days of receiving this request.
																			 </p>
																			 
                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>

                                                                            <table border="0" cellpadding="0" cellspacing="0" class="button_block block-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%">
                                                                                <tr>
                                                                                    <td class="pad" style="padding: 10px; text-align: center;">
                                                                                        <a href="${signPdf}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px; border: 1px solid #3e8e41; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" target="_blank">Sign Here</a>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>

                                                                            <p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			 </p>
																			 
																			 	<p
																			style="margin: 0; mso-line-height-alt: 21px;">
																			Should you have any questions or need clarification regarding the document or the signing process, please feel free to reach out to the sender. Wishing you continued growth and success!</p>
																	
																			 
																	
																	
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
																</table>
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

        };

        sendMail = await axios.post(url, params, { headers: headers });
      } catch (error) {
        console.log("error", error);
      }
    }
    if (sendMail?.data?.result?.status === "success") {
      setMailStatus("success");
      try {
        let data;
        if (
          requestBody &&
          requestSubject &&
          isCustomize
        ) {
          data = {
            RequestBody: htmlReqBody,
            RequestSubject: requestSubject,
            SendMail: true
          };
        } else if (
          tenantMailTemplate?.body &&
          tenantMailTemplate?.subject
        ) {
          data = {
            RequestBody: tenantMailTemplate?.body,
            RequestSubject: tenantMailTemplate?.subject,
            SendMail: true
          };
        } else {
          data = { SendMail: true };
        }
        try {
          await axios.put(
            `${localStorage.getItem(
              "baseUrl"
            )}classes/contracts_Document/${documentId}`,
            data,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Parse-Application-Id": localStorage.getItem("parseAppId"),
                "X-Parse-Session-Token": localStorage.getItem("accesstoken")
              }
            }
          );
        } catch (err) {
          console.log("axois err ", err);
        }
      } catch (e) {
        console.log("error", e);
      }
      setIsSend(true);
      setIsMailSend(true);
      setIsLoading({ isLoad: false });
      setIsUiLoading(false);
    } else if (sendMail?.data?.result?.status === "quota-reached") {
      setMailStatus("quotareached");
      setIsSend(true);
      setIsMailSend(true);
      setIsUiLoading(false);
    } else {
      setMailStatus("failed");
      setIsSend(true);
      setIsMailSend(true);
      setIsUiLoading(false);
    }
  };
  const handleDontShow = (isChecked) => {
    setIsDontShow(isChecked);
  };
  //here you can add your messages in content and selector is key of particular steps

  const tourConfig = [
    {
      selector: '[data-tut="recipientArea"]',
      content: () => (
        <TourContentWithBtn
          message={t("tour-mssg.placeholder-sign-1")}
          isChecked={handleDontShow}
        />
      ),
      position: "top",
      style: { fontSize: "13px" }
    },
    {
      selector: '[data-tut="addRecipient"]',
      content: () => (
        <TourContentWithBtn
          message={t("tour-mssg.placeholder-sign-3")}
          isChecked={handleDontShow}
        />
      ),
      position: "top",
      style: { fontSize: "13px" }
    },
    {
      selector: '[data-tut="addWidgets"]',
      content: () => (
        <TourContentWithBtn
          message={t("tour-mssg.placeholder-sign-4")}
          isChecked={handleDontShow}
        />
      ),
      position: "top",
      style: { fontSize: "13px" }
    },
    {
      selector: '[data-tut="pdfArea"]',
      content: () => (
        <TourContentWithBtn
          message={t("tour-mssg.placeholder-sign-5")}
          isChecked={handleDontShow}
        />
      ),
      position: "top",
      style: { fontSize: "13px" }
    },
    {
      selector: '[data-tut="headerArea"]',
      content: () => (
        <TourContentWithBtn
          message={t("tour-mssg.placeholder-sign-6")}
          isChecked={handleDontShow}
        />
      ),
      position: "top",
      style: { fontSize: "13px" }
    }
  ];

  const handleSaveWidgetsOptions = (
    dropdownName,
    dropdownOptions,
    minCount,
    maxCount,
    isReadOnly,
    addOption,
    deleteOption,
    status,
    defaultValue,
    isHideLabel
  ) => {
    const filterSignerPos = signerPos.filter((data) => data.Id === uniqueId);
    if (filterSignerPos.length > 0) {
      const getPlaceHolder = filterSignerPos[0].placeHolder;
      const getPageNumer = getPlaceHolder.filter(
        (data) => data.pageNumber === pageNumber
      );
      if (getPageNumer.length > 0) {
        const getXYdata = getPageNumer[0].pos;
        const getPosData = getXYdata;
        const addSignPos = getPosData.map((position) => {
          if (position.key === signKey) {
            if (widgetType === radioButtonWidget) {
              if (addOption) {
                return {
                  ...position,
                  Height: position.Height
                    ? position.Height + 15
                    : defaultWidthHeight(widgetType).height + 15
                };
              } else if (deleteOption) {
                return {
                  ...position,
                  Height: position.Height
                    ? position.Height - 15
                    : defaultWidthHeight(widgetType).height - 15
                };
              } else {
                return {
                  ...position,
                  options: {
                    ...position.options,
                    name: dropdownName,
                    values: dropdownOptions,
                    isReadOnly: isReadOnly || false,
                    isHideLabel: isHideLabel || false,
                    defaultValue: defaultValue,
                    fontSize:
                      fontSize || currWidgetsDetails?.options?.fontSize || 12,
                    fontColor:
                      fontColor ||
                      currWidgetsDetails?.options?.fontColor ||
                      "black"
                  }
                };
              }
            } else if (widgetType === "checkbox") {
              if (addOption) {
                return {
                  ...position,
                  Height: position.Height
                    ? position.Height + 15
                    : defaultWidthHeight(widgetType).height + 15
                };
              } else if (deleteOption) {
                return {
                  ...position,
                  Height: position.Height
                    ? position.Height - 15
                    : defaultWidthHeight(widgetType).height - 15
                };
              } else {
                return {
                  ...position,
                  options: {
                    ...position.options,
                    name: dropdownName,
                    values: dropdownOptions,
                    validation: {
                      minRequiredCount: minCount,
                      maxRequiredCount: maxCount
                    },
                    defaultValue: defaultValue,
                    isReadOnly: isReadOnly || false,
                    isHideLabel: isHideLabel || false,
                    fontSize:
                      fontSize || currWidgetsDetails?.options?.fontSize || 12,
                    fontColor:
                      fontColor ||
                      currWidgetsDetails?.options?.fontColor ||
                      "black"
                  }
                };
              }
            } else {
              return {
                ...position,
                options: {
                  ...position.options,
                  name: dropdownName,
                  status: status,
                  values: dropdownOptions,
                  defaultValue: defaultValue,
                  fontSize:
                    fontSize || currWidgetsDetails?.options?.fontSize || 12,
                  fontColor:
                    fontColor ||
                    currWidgetsDetails?.options?.fontColor ||
                    "black",
                  ...(isReadOnly ? { isReadOnly: isReadOnly || false } : {})
                }
              };
            }
          }
          return position;
        });

        const newUpdateSignPos = getPlaceHolder.map((obj) => {
          if (obj.pageNumber === pageNumber) {
            return { ...obj, pos: addSignPos };
          }
          return obj;
        });
        const newUpdateSigner = signerPos.map((obj) => {
          if (obj.Id === uniqueId) {
            return { ...obj, placeHolder: newUpdateSignPos };
          }
          return obj;
        });

        setSignerPos(newUpdateSigner);
        if (!addOption && !deleteOption) {
          handleNameModal();
        }
      }
    }
    setFontSize();
    setFontColor();
  };
  const handleWidgetdefaultdata = (defaultdata, isSignWidget) => {
    if (isSignWidget) {
      const updatedPdfDetails = [...pdfDetails];
      const signtypes = defaultdata.signatureType || signatureType;
      updatedPdfDetails[0].SignatureType = signtypes;
      // Update the SignatureType with the modified array
      setPdfDetails(updatedPdfDetails);
      setSignatureType(signtypes);
    }
    const filterSignerPos = signerPos.filter((data) => data.Id === uniqueId);
    if (filterSignerPos.length > 0) {
      const getPlaceHolder = filterSignerPos[0].placeHolder;

      const getPageNumer = getPlaceHolder.filter(
        (data) => data.pageNumber === pageNumber
      );

      if (getPageNumer.length > 0) {
        const getXYdata = getPageNumer[0].pos;
        const getPosData = getXYdata;
        const addSignPos = getPosData.map((position) => {
          if (position.key === signKey) {
            if (position.type === textInputWidget) {
              return {
                ...position,
                options: {
                  ...position.options,
                  name: defaultdata?.name || "text",
                  status: defaultdata?.status || "required",
                  hint: defaultdata?.hint || "",
                  defaultValue: defaultdata?.defaultValue || "",
                  validation:
                        {},
                  fontSize:
                    fontSize || currWidgetsDetails?.options?.fontSize || 12,
                  fontColor:
                    fontColor ||
                    currWidgetsDetails?.options?.fontColor ||
                    "black",
                  isReadOnly: defaultdata?.isReadOnly || false
                }
              };
            } else {
              return {
                ...position,
                options: {
                  ...position.options,
                  name: defaultdata.name,
                  status: defaultdata.status,
                  defaultValue: defaultdata.defaultValue,
                  fontSize:
                    fontSize || currWidgetsDetails?.options?.fontSize || 12,
                  fontColor:
                    fontColor ||
                    currWidgetsDetails?.options?.fontColor ||
                    "black"
                }
              };
            }
          }
          return position;
        });

        const newUpdateSignPos = getPlaceHolder.map((obj) => {
          if (obj.pageNumber === pageNumber) {
            return { ...obj, pos: addSignPos };
          }
          return obj;
        });
        const newUpdateSigner = signerPos.map((obj) => {
          if (obj.Id === uniqueId) {
            return { ...obj, placeHolder: newUpdateSignPos };
          }
          return obj;
        });
        setSignerPos(newUpdateSigner);
      }
    }
    setCurrWidgetsDetails({});
    setFontSize();
    setFontColor();
    handleNameModal();
  };

  const handleNameModal = () => {
    setIsNameModal(false);
    setCurrWidgetsDetails({});
    setShowDropdown(false);
    setIsRadio(false);
    setIsCheckbox(false);
    setIsPageCopy(false);
    //condition for text widget type after set all values for text widget
    //change setUniqueId which is set in tempsignerId
    //because textwidget do not have signer user so for selected signers we have to do
    if (currWidgetsDetails.type === textWidget) {
      setUniqueId(tempSignerId);
      setTempSignerId("");
    }
  };
  //function for update TourStatus
  const closeTour = async () => {
    setPlaceholderTour(false);
    if (isDontShow) {
      let updatedTourStatus = [];
      if (tourStatus.length > 0) {
        updatedTourStatus = [...tourStatus];
        const placeholderIndex = tourStatus.findIndex(
          (obj) => obj["placeholder"] === false || obj["placeholder"] === true
        );
        if (placeholderIndex !== -1) {
          updatedTourStatus[placeholderIndex] = { placeholder: true };
        } else {
          updatedTourStatus.push({ placeholder: true });
        }
      } else {
        updatedTourStatus = [{ placeholder: true }];
      }
      try {
        await axios.put(
          `${localStorage.getItem(
            "baseUrl"
          )}classes/contracts_Users/${signerUserId}`,
          { TourStatus: updatedTourStatus },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Parse-Application-Id": localStorage.getItem("parseAppId"),
              sessionToken: localStorage.getItem("accesstoken")
            }
          }
        );
      } catch (err) {
        console.log("axois err ", err);
      }
    }
  };
  const handleRecipientSign = () => {
    if (currentId) {
      navigate(`/recipientSignPdf/${documentId}/${currentId}`);
    } else {
      navigate(`/recipientSignPdf/${documentId}`);
    }
  };
  const handleLinkUser = (id) => {
    setIsAddUser({ [id]: true });
  };
  //`handleAddUser` function to use add new user
  const handleAddUser = (data, signerObjId) => {
    const id = signerObjId ? signerObjId : isNewContact?.id || uniqueId;
    if (isAddSigner) {
      handleAddNewRecipients(data);
    } else {
      if (data && data.objectId) {
        const signerPtr = {
          __type: "Pointer",
          className: "contracts_Contactbook",
          objectId: data.objectId
        };
        const updatePlaceHolder = signerPos.map((x) => {
          if (x.Id === id) {
            return { ...x, signerPtr: signerPtr, signerObjId: data.objectId };
          }
          return { ...x };
        });
        setSignerPos(updatePlaceHolder);
        const updateSigner = signersdata.map((x) => {
          if (x.Id === id) {
            return { ...x, ...data, className: "contracts_Contactbook" };
          }
          return { ...x };
        });
        if (updateSigner && updateSigner.length > 0) {
          const currEmail = pdfDetails[0].ExtUserPtr.Email;
          const getCurrentUserDeatils = updateSigner.filter(
            (x) => x.Email === currEmail
          );
          if (getCurrentUserDeatils && getCurrentUserDeatils.length > 0) {
            setCurrentId(getCurrentUserDeatils[0].Email);
          }
        }
        setSignersData(updateSigner);
        const index = signersdata.findIndex((x) => x.Id === id);
        setIsSelectId(index);
      }
      if (isNewContact.status) {
        let newForm = [...forms];
        const label = `${data.Name}<${data.Email}>`;
        const index = newForm.findIndex((x) => x.value === id);
        newForm[index].label = label;
        newForm[index].value = data?.objectId;
        setForms(newForm);
      }
    }
  };
  //function to add new signer in document signers list
  const handleAddNewRecipients = (data) => {
    const newId = randomId();
    const backgroundColor = color[signersdata.length];
    signersdata.push({
      ...data,
      className: "contracts_Contactbook",
      Id: newId,
      blockColor: backgroundColor
    });
    const signerPosObj = {
      signerPtr: {
        __type: "Pointer",
        className: "contracts_Contactbook",
        objectId: data.objectId
      },
      signerObjId: data.objectId,
      blockColor: backgroundColor,
      Id: newId
    };
    setSignerPos((prev) => [...prev, signerPosObj]);
    setUniqueId(newId);
    setIsSelectId(signersdata.length - 1);
    setBlockColor(color[signersdata.length - 1]);
  };

  const closePopup = () => {
    setIsAddUser({});
    setIsAddSigner(false);
    setIsNewContact({ status: false, id: "" });
  };

  //function for handle ontext change and save again text in delta in Request Email flow
  const handleOnchangeRequest = () => {
    if (editorRef.current) {
      const html = editorRef.current.editor.root.innerHTML;
      setRequestBody(html);
    }
  };

  const signerAssignTour = [
    {
      selector: '[data-tut="assignSigner"]',
      content: t("attach-signer-tour"),
      position: "top",
      style: { fontSize: "13px" }
    }
  ];
  const textFieldTour = [
    {
      selector: '[data-tut="IsSigned"]',
      content: t("text-field-tour"),
      position: "top",
      style: { fontSize: "13px" }
    }
  ];
  const signatureWidgetTour = [
    {
      selector: '[data-tut="isSignatureWidget"]',
      content: t("signature-field-widget", { signersName }),
      position: "top",
      style: { fontSize: "13px" }
    }
  ];

  // `handleDeleteUser` function is used to delete record and placeholder when user click on delete which is place next user name in recipients list
  const handleDeleteUser = (Id) => {
    const updateSigner = signersdata
      .filter((x) => x.Id !== Id)
      .map((x, i) => ({ ...x, blockColor: color[i] }));
    setSignersData(updateSigner);
    const updatePlaceholderUser = signerPos
      .filter((x) => x.Id !== Id)
      .map((x, i) => ({ ...x, blockColor: color[i] }));
    const index = signersdata.findIndex((x) => x.Id === Id);
    if (index === signersdata.length - 1) {
      setUniqueId(updateSigner[updateSigner.length - 1]?.Id || "");
      setIsSelectId(index - 1 || 0);
      setBlockColor(color[index - 1 || 0]);
    } else {
      setUniqueId(updateSigner[index]?.Id || "");
      setIsSelectId(index);
      setBlockColor(color[index]);
    }
    setSignerPos(updatePlaceholderUser);
    setIsMailSend(false);
  };
  const handleCloseSendmailModal = () => {
    setIsSendAlert({});
    if (isSendAlert.mssg === "confirm") {
      setIsAlreadyPlace({
        status: true,
        message: t("document-signed-alert-8")
      });
    }
  };
  const clickOnZoomIn = () => {
    onClickZoomIn(scale, zoomPercent, setScale, setZoomPercent);
  };
  const clickOnZoomOut = () => {
    onClickZoomOut(zoomPercent, scale, setZoomPercent, setScale);
  };
  //`handleRotationFun` function is used to roatate pdf particular page
  const handleRotationFun = async (rotateDegree) => {
    const rotatePlaceholderExist = handleRotateWarning(signerPos, pageNumber);
    //show rotation alert if widgets already exist
    if (rotatePlaceholderExist) {
      setShowRotateAlert({ status: true, degree: rotateDegree });
    } else {
      setIsUploadPdf(true);
      const urlDetails = await rotatePdfPage(
        rotateDegree,
        pageNumber - 1,
        pdfArrayBuffer
      );
      setPdfArrayBuffer(urlDetails.arrayBuffer);
      setPdfBase64Url(urlDetails.base64);
    }
  };
  const handleRemovePlaceholder = async () => {
    handleRemoveWidgets(
      setSignerPos,
      signerPos,
      pageNumber,
      setShowRotateAlert
    );
    const urlDetails = await rotatePdfPage(
      showRotateAlert.degree,
      pageNumber - 1,
      pdfArrayBuffer
    );
    setPdfArrayBuffer(urlDetails.arrayBuffer);
    setPdfBase64Url(urlDetails.base64);
  };
  const handleSendDoc = () => {
    postSignedDocument();
    setIsAttchSignerModal(false);
    setCheckTourStatus(true);
    alertSendEmail();
  };

  const postSignedDocument = async () => {// Get token from localStorage

    try {
      const response = await axios.post(`${djangoUrl}/base/api/v1/signed/document/`, {
        user: userEmail // Body of the request
      }, {
        headers: {
          'Authorization': `Bearer ${token}` // Authorization header
        }
      });
      console.log('Document signed response:', response.data);
      // Handle the response as needed
    } catch (error) {
      console.error('Error posting signed document:', error);
    }
  };

  //show modal to create new contact
  const handleCreateNew = (e, id) => {
    e.preventDefault();
    setIsNewContact({ status: true, id: id });
  };
  //`handleInputChange` function to get signers list from dropdown
  const handleInputChange = (item, id) => {
    const signerExist = forms.some((x) => x.value === item.value);
    if (signerExist) {
      alert(t("already-exist-signer"));
    } else {
      let newForm = [...forms];
      let signerId = newForm[id].value;
      newForm[id].label = item?.label;
      newForm[id].value = item?.value;
      setForms(newForm);
      const getSigner = userList.find((x) => x.objectId === item.value);
      handleAddUser(getSigner, signerId);
    }
  };

  //`loadOptions` function to use show all list of signer in dropdown
  const loadOptions = async (inputValue) => {
    try {
      const baseURL = localStorage.getItem("baseUrl");
      const url = `${baseURL}functions/getsigners`;
      const token = {
        "X-Parse-Session-Token": localStorage.getItem("accesstoken")
      };
      const headers = {
        "Content-Type": "application/json",
        "X-Parse-Application-Id": localStorage.getItem("parseAppId"),
        ...token
      };
      const search = inputValue;
      const axiosRes = await axios.post(url, { search }, { headers });
      const contactRes = axiosRes?.data?.result || [];
      if (contactRes) {
        const res = JSON.parse(JSON.stringify(contactRes));
        const result = res;
        setUserList(result);
        return await result.map((item) => ({
          label: `${item.Name}<${item.Email}>`,
          value: item.objectId
        }));
      }
    } catch (error) {
      console.log("err", error);
    }
  };
  const handleDisable = () => {
    const isAllSigner = signerPos.some((x) => !x.signerObjId);
    return isAllSigner;
  };
  const handleCloseAttachSigner = () => {
    setIsAttchSignerModal(false);
  };

  

  return (
    <>
      <Title title={state?.title ? state.title : "New Document"} />
      <DndProvider backend={HTML5Backend}>
        {isLoading.isLoad ? (
          <LoaderWithMsg isLoading={isLoading} />
        ) : handleError ? (
          <HandleError handleError={handleError} />
        ) : (
          <div>
            {isUiLoading && (
              <div className="absolute h-[100vh] w-full flex flex-col justify-center items-center z-[999] bg-[#e6f2f2] bg-opacity-80">
                <Loader />
                <span className="text-[13px] text-base-content">
                  {t("loading-mssg")}
                </span>
              </div>
            )}
            <div className="relative op-card overflow-hidden flex flex-col md:flex-row justify-between bg-base-300">
              {/* this component used for UI interaction and show their functionality */}
              {!checkTourStatus && !isAttchSignerModal && (
                //this tour component used in your html component where you want to put
                //onRequestClose function to close tour
                //steps is defined what will be your messages and style also
                //isOpen is takes boolean value to open
                <Tour
                  onRequestClose={closeTour}
                  steps={tourConfig}
                  isOpen={placeholderTour}
                  rounded={5}
                  closeWithMask={false}
                />
              )}
              <Tour
                onRequestClose={() => setSignerExistModal(false)}
                steps={signerAssignTour}
                isOpen={signerExistModal}
                rounded={5}
                closeWithMask={false}
              />
              <Tour
                onRequestClose={() => setIsSendAlert({})}
                steps={textFieldTour}
                isOpen={isSendAlert.mssg === textWidget}
                rounded={5}
                closeWithMask={false}
              />
              <Tour
                onRequestClose={() => handleCloseSendmailModal()}
                steps={signatureWidgetTour}
                isOpen={isSendAlert.mssg === "sure" && true}
                rounded={5}
                closeWithMask={false}
              />
              {/* this component used to render all pdf pages in left side */}
              <RenderAllPdfPage
                allPages={allPages}
                setAllPages={setAllPages}
                setPageNumber={setPageNumber}
                setSignBtnPosition={setSignBtnPosition}
                pageNumber={pageNumber}
                pdfBase64Url={pdfBase64Url}
                signedUrl={pdfDetails?.[0]?.SignedUrl || ""}
                setPdfArrayBuffer={setPdfArrayBuffer}
                setPdfBase64Url={setPdfBase64Url}
                setIsUploadPdf={setIsUploadPdf}
                pdfArrayBuffer={pdfArrayBuffer}
                isMergePdfBtn={true}
              />
              {/* pdf render view */}
              <div className=" w-full md:w-[57%] flex mr-4">
                <PdfZoom
                  clickOnZoomIn={clickOnZoomIn}
                  clickOnZoomOut={clickOnZoomOut}
                  handleRotationFun={handleRotationFun}
                  pdfArrayBuffer={pdfArrayBuffer}
                  pageNumber={pageNumber}
                  setPdfBase64Url={setPdfBase64Url}
                  setPdfArrayBuffer={setPdfArrayBuffer}
                  setIsUploadPdf={setIsUploadPdf}
                  setSignerPos={setSignerPos}
                  signerPos={signerPos}
                  userId={uniqueId}
                  allPages={allPages}
                  setAllPages={setAllPages}
                  setPageNumber={setPageNumber}
                />
                <div className=" w-full md:w-[95%] ">
                  {/* this modal is used show alert set placeholder for all signers before send mail */}
                  <ModalUi
                    isOpen={
                      isSendAlert.alert &&
                      isSendAlert.mssg !== textWidget &&
                      isSendAlert.mssg === "confirm"
                    }
                    title={isSendAlert.mssg === "confirm" && t("send-mail")}
                    handleClose={() => handleCloseSendmailModal()}
                    reduceWidth={isCustomize ? "md:min-w-[700px] md:max-w-[80%]" : undefined}
                  >
                    <div className={`${isCustomize ? "max-h-[70vh]" : "max-h-96"} overflow-y-auto scroll-hide p-[20px] text-base-content`}>
                      {isSendAlert.mssg === "confirm" && (
                        <>
                          {!isCustomize && (
                            <span>{t("placeholder-alert-3")}</span>
                          )}
                          {
                              isCustomize && (
                                <>
                                  <EmailBody
                                    editorRef={editorRef}
                                    requestBody={requestBody}
                                    requestSubject={requestSubject}
                                    handleOnchangeRequest={
                                      handleOnchangeRequest
                                    }
                                    setRequestSubject={setRequestSubject}
                                  />
                                  <div
                                    className="flex justify-end items-center gap-1 mt-2 op-link op-link-primary"
                                    onClick={() => {
                                      setRequestBody(defaultBody);
                                      setRequestSubject(defaultSubject);
                                    }}
                                  >
                                    <span>{t("reset-to-default")}</span>
                                  </div>
                                </>
                              )
                          }
                          <div className="flex flex-row items-center gap-2 md:gap-6 mt-2">
                            <div className="flex flex-row gap-2">
                              <button
                                onClick={() => sendEmailToSigners()}
                                className="op-btn op-btn-primary font-[500] text-sm shadow"
                              >
                                {t("send")}
                              </button>
                              {isCustomize && (
                                <button
                                  onClick={() => setIsCustomize(false)}
                                  className="op-btn op-btn-ghost font-[500] text-sm"
                                >
                                  {t("close")}
                                </button>
                              )}
                            </div>
                            {
                                !isCustomize && (
                                  <span
                                    className="op-link op-link-accent text-sm"
                                    onClick={() => setIsCustomize(!isCustomize)}
                                  >
                                    {t("cutomize-email")}
                                  </span>
                                )
                            }
                          </div>
                        </>
                      )}
                      {isSendAlert.mssg === "confirm" && (
                        <>
                          <div className="flex justify-center items-center mt-3">
                            <span className="h-[1px] w-[20%] bg-[#ccc]"></span>
                            <span className="ml-[5px] mr-[5px]">{t("or")}</span>
                            <span className="h-[1px] w-[20%] bg-[#ccc]"></span>
                          </div>
                          <div className="my-3">{handleShareList()}</div>
                        </>
                      )}
                    </div>
                  </ModalUi>
                  {/* this modal is used show send mail  message and after send mail success message */}
                  <ModalUi
                    isOpen={isSend}
                    title={
                      mailStatus === "success"
                        ? t("mails-sent")
                        : mailStatus === "quotareached"
                          ? t("quota-mail-head")
                          : t("mail-not-delivered")
                    }
                    handleClose={() => {
                      setIsSend(false);
                      setSignerPos([]);
                      navigate("/report/1MwEuxLEkF");
                    }}
                  >
                    <div className="h-[100%] p-[20px]">
                      {mailStatus === "success" ? (
                        <div className="text-center mb-[10px]">
                          <LottieWithLoader />
                          {pdfDetails[0].SendinOrder ? (
                            <p>
                              {t("placeholder-mail-alert", {
                                name: pdfDetails[0]?.Signers[0]?.Name
                              })}
                            </p>
                          ) : (
                            <p>{t("placeholder-alert-4")}</p>
                          )}
                          {isCurrUser && <p>{t("placeholder-alert-5")}</p>}
                        </div>
                      ) : mailStatus === "quotareached" ? (
                        <div className="flex flex-col gap-y-3">
                          <div className="my-3">{handleShareList()}</div>
                        </div>
                      ) : (
                        <div className="mb-[10px]">
                          <p>{t("placeholder-alert-6")}</p>
                          {isCurrUser && (
                            <p className="mt-1">{t("placeholder-alert-5")}</p>
                          )}
                        </div>
                      )}
                      {!mailStatus && (
                        <div className="w-full h-[1px] bg-[#9f9f9f] my-[15px]"></div>
                      )}
                      {mailStatus !== "quotareached" && (
                        <div
                          className={
                            mailStatus === "success"
                              ? "flex justify-center mt-1"
                              : ""
                          }
                        >
                          {isCurrUser && (
                            <button
                              onClick={() => handleRecipientSign()}
                              type="button"
                              className="op-btn op-btn-primary mr-1"
                            >
                              {t("yes")}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setIsSend(false);
                              setSignerPos([]);
                              navigate("/report/1MwEuxLEkF");
                            }}
                            type="button"
                            className="op-btn op-btn-ghost"
                          >
                            {isCurrUser ? t("no") : t("close")}
                          </button>
                        </div>
                      )}
                    </div>
                  </ModalUi>
                  <ModalUi
                    isOpen={isShowEmail}
                    title={t("signers-alert")}
                    handleClose={() => setIsShowEmail(false)}
                  >
                    <div className="h-[100%] p-[20px]">
                      <p>{t("placeholder-alert-7")}</p>
                      <div className="w-full h-[1px] bg-[#9f9f9f] my-[15px]"></div>
                      <button
                        onClick={() => setIsShowEmail(false)}
                        type="button"
                        className="op-btn op-btn-primary"
                      >
                        {t("ok")}
                      </button>
                    </div>
                  </ModalUi>
                  <ModalUi
                    isOpen={isAttchSignerModal}
                    title={t("add-signer")}
                    handleClose={() => handleCloseAttachSigner()}
                  >
                    <div className="h-[100%] p-[20px]">
                      {pdfDetails[0].Placeholders?.some(
                        (x) => !x.signerObjId
                      ) && (
                        <>
                          {/* grid grid-cols-1 md:grid-cols-2 */}
                          <div className="min-h-max max-h-[250px] overflow-y-auto">
                            <div className="p-3 op-card border-[1px] border-gray-400 mt-3 mx-4 mb-4 bg-base-200 text-base-content flex flex-col gap-2 relative">
                              {forms?.map((field, id) => {
                                return (
                                  <div
                                    className="flex flex-col"
                                    key={field?.value}
                                  >
                                    <label>{field?.role}</label>
                                    <div className="flex justify-between items-center gap-2">
                                      <div className="flex-1">
                                        <AsyncSelect
                                          cacheOptions
                                          defaultOptions
                                          value={field}
                                          loadingMessage={() => t("loading")}
                                          noOptionsMessage={() =>
                                            t("contact-not-found")
                                          }
                                          loadOptions={loadOptions}
                                          onChange={(item) =>
                                            handleInputChange(item, id)
                                          }
                                          unstyled
                                          onFocus={() => loadOptions()}
                                          classNames={{
                                            control: () =>
                                              "op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full h-full text-[11px]",
                                            valueContainer: () =>
                                              "flex flex-row gap-x-[2px] gap-y-[2px] md:gap-y-0 w-full my-[2px]",
                                            multiValue: () =>
                                              "op-badge op-badge-primary h-full text-[11px]",
                                            multiValueLabel: () => "mb-[2px]",
                                            menu: () =>
                                              "mt-1 shadow-md rounded-lg bg-base-200 text-base-content absolute z-9999",
                                            menuList: () =>
                                              "shadow-md rounded-lg  ",
                                            option: () =>
                                              "bg-base-200 text-base-content rounded-lg m-1 hover:bg-base-300 p-2 ",
                                            noOptionsMessage: () =>
                                              "p-2 bg-base-200 rounded-lg m-1 p-2"
                                          }}
                                          menuPortalTarget={document.getElementById(
                                            "selectSignerModal"
                                          )}
                                        />
                                      </div>
                                      <button
                                        onClick={(e) =>
                                          handleCreateNew(e, field.value)
                                        }
                                        className="op-btn op-btn-accent  op-btn-outline op-btn-sm  "
                                      >
                                        <i className="fa-light fa-plus"></i>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="w-full h-[1px] bg-[#9f9f9f] my-[15px]"></div>
                          <div className="flex  mx-4 mb-4 gap-3">
                            <button
                              disabled={handleDisable()}
                              onClick={() => handleSendDoc()}
                              type="submit"
                              className="op-btn op-btn-primary focus:outline-none"
                            >
                              <i className="fa-light fa-paper-plane"></i>{" "}
                              <span>{t("next")}</span>
                            </button>
                            <button
                              onClick={() => handleCloseAttachSigner()}
                              type="submit"
                              className="op-btn op-btn-secondary focus:outline-none"
                            >
                              <i className="fa-regular fa-pen-to-square"></i>
                              <span>{t("edit")}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </ModalUi>
                  <ModalUi
                    title={""}
                    isOpen={isNewContact.status}
                    handleClose={closePopup}
                  >
                    <AddContact
                      details={handleAddUser}
                      closePopup={closePopup}
                    />
                  </ModalUi>
                  <PlaceholderCopy
                    isPageCopy={isPageCopy}
                    setIsPageCopy={setIsPageCopy}
                    xyPosition={signerPos}
                    setXyPosition={setSignerPos}
                    allPages={allPages}
                    pageNumber={pageNumber}
                    signKey={signKey}
                    Id={uniqueId}
                    widgetType={widgetType}
                    setUniqueId={setUniqueId}
                    tempSignerId={tempSignerId}
                    setTempSignerId={setTempSignerId}
                  />
                  <DropdownWidgetOption
                    type={radioButtonWidget}
                    title={t("radio-group")}
                    showDropdown={isRadio}
                    setShowDropdown={setIsRadio}
                    handleSaveWidgetsOptions={handleSaveWidgetsOptions}
                    currWidgetsDetails={currWidgetsDetails}
                    setCurrWidgetsDetails={setCurrWidgetsDetails}
                    handleClose={handleNameModal}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    fontColor={fontColor}
                    setFontColor={setFontColor}
                    isShowAdvanceFeature={true}
                  />
                  <DropdownWidgetOption
                    type="checkbox"
                    title={t("checkbox")}
                    showDropdown={isCheckbox}
                    setShowDropdown={setIsCheckbox}
                    handleSaveWidgetsOptions={handleSaveWidgetsOptions}
                    currWidgetsDetails={currWidgetsDetails}
                    setCurrWidgetsDetails={setCurrWidgetsDetails}
                    handleClose={handleNameModal}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    fontColor={fontColor}
                    setFontColor={setFontColor}
                    isShowAdvanceFeature={true}
                  />
                  <DropdownWidgetOption
                    type="dropdown"
                    title={t("dropdown-options")}
                    showDropdown={showDropdown}
                    setShowDropdown={setShowDropdown}
                    handleSaveWidgetsOptions={handleSaveWidgetsOptions}
                    currWidgetsDetails={currWidgetsDetails}
                    setCurrWidgetsDetails={setCurrWidgetsDetails}
                    handleClose={handleNameModal}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    fontColor={fontColor}
                    setFontColor={setFontColor}
                    isShowAdvanceFeature={true}
                  />

                  {/* pdf header which contain funish back button */}
                  <Header
                    completeBtnTitle={t("next")}
                    isPlaceholder={true}
                    pageNumber={pageNumber}
                    allPages={allPages}
                    changePage={changePage}
                    pdfDetails={pdfDetails}
                    signerPos={signerPos}
                    signersdata={signersdata}
                    isMailSend={isMailSend}
                    alertSendEmail={alertSendEmail}
                    isShowHeader={true}
                    currentSigner={true}
                    handleRotationFun={handleRotationFun}
                    clickOnZoomIn={clickOnZoomIn}
                    clickOnZoomOut={clickOnZoomOut}
                    setIsUploadPdf={setIsUploadPdf}
                    pdfArrayBuffer={pdfArrayBuffer}
                    setPdfArrayBuffer={setPdfArrayBuffer}
                    setPdfBase64Url={setPdfBase64Url}
                    setSignerPos={setSignerPos}
                    userId={uniqueId}
                    pdfBase64={pdfBase64Url}
                  />

                  <div
                    ref={divRef}
                    data-tut="pdfArea"
                    className="h-full md:h-[95%]"
                  >
                    {containerWH && (
                      <RenderPdf
                        pageNumber={pageNumber}
                        pdfNewWidth={pdfNewWidth}
                        pdfDetails={pdfDetails}
                        signerPos={signerPos}
                        successEmail={false}
                        numPages={numPages}
                        pageDetails={pageDetails}
                        placeholder={true}
                        drop={drop}
                        handleDeleteSign={handleDeleteSign}
                        handleTabDrag={handleTabDrag}
                        handleStop={handleStop}
                        setPdfLoad={setPdfLoad}
                        pdfLoad={pdfLoad}
                        setSignerPos={setSignerPos}
                        containerWH={containerWH}
                        setIsResize={setIsResize}
                        isResize={isResize}
                        setZIndex={setZIndex}
                        setIsPageCopy={setIsPageCopy}
                        signersdata={signersdata}
                        setSignKey={setSignKey}
                        handleLinkUser={handleLinkUser}
                        setUniqueId={setUniqueId}
                        isDragging={isDragging}
                        setShowDropdown={setShowDropdown}
                        setWidgetType={setWidgetType}
                        setIsRadio={setIsRadio}
                        setIsCheckbox={setIsCheckbox}
                        setCurrWidgetsDetails={setCurrWidgetsDetails}
                        setSelectWidgetId={setSelectWidgetId}
                        selectWidgetId={selectWidgetId}
                        handleNameModal={setIsNameModal}
                        setTempSignerId={setTempSignerId}
                        uniqueId={uniqueId}
                        pdfOriginalWH={pdfOriginalWH}
                        setScale={setScale}
                        scale={scale}
                        setIsSelectId={setIsSelectId}
                        pdfBase64Url={pdfBase64Url}
                        fontSize={fontSize}
                        setFontSize={setFontSize}
                        fontColor={fontColor}
                        setFontColor={setFontColor}
                        unSignedWidgetId={unSignedWidgetId}
                        divRef={divRef}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* signature button */}
              <div className="w-full md:w-[23%] bg-base-100 overflow-y-auto hide-scrollbar">
                <div className={`max-h-screen`}>
                  {isMobile ? (
                    <div>
                      <WidgetComponent
                        pdfUrl={isMailSend}
                        handleDivClick={handleDivClick}
                        handleMouseLeave={handleMouseLeave}
                        isSignYourself={false}
                        addPositionOfSignature={addPositionOfSignature}
                        signerPos={signerPos}
                        signersdata={signersdata}
                        isSelectListId={isSelectListId}
                        setIsSelectId={setIsSelectId}
                        isSigners={true}
                        setIsShowEmail={setIsShowEmail}
                        isMailSend={isMailSend}
                        setSelectedEmail={setSelectedEmail}
                        selectedEmail={selectedEmail}
                        setUniqueId={setUniqueId}
                        setRoleName={setRoleName}
                        initial={true}
                        sendInOrder={pdfDetails[0].SendinOrder}
                        setSignersData={setSignersData}
                        blockColor={blockColor}
                        setBlockColor={setBlockColor}
                        setIsAddSigner={setIsAddSigner}
                        handleDeleteUser={handleDeleteUser}
                        uniqueId={uniqueId}
                        setSignerPos={setSignerPos}
                        setSelectWidgetId={setSelectWidgetId}
                        isPlaceHolderSign={true}
                      />
                    </div>
                  ) : (
                    <div>
                      <div
                        className="hidden md:block w-full h-full bg-base-100"
                        aria-disabled
                      >
                        <SignerListPlace
                          setSignerPos={setSignerPos}
                          signerPos={signerPos}
                          signersdata={signersdata}
                          isSelectListId={isSelectListId}
                          setIsSelectId={setIsSelectId}
                          setUniqueId={setUniqueId}
                          setRoleName={setRoleName}
                          sendInOrder={pdfDetails[0].SendinOrder}
                          setSignersData={setSignersData}
                          blockColor={blockColor}
                          setBlockColor={setBlockColor}
                          isMailSend={isMailSend}
                          setIsAddSigner={setIsAddSigner}
                          handleDeleteUser={handleDeleteUser}
                          roleName={roleName}
                          uniqueId={uniqueId}
                          // handleAddSigner={handleAddSigner}
                        />
                        <div data-tut="addWidgets">
                          <WidgetComponent
                            isMailSend={isMailSend}
                            handleDivClick={handleDivClick}
                            handleMouseLeave={handleMouseLeave}
                            isSignYourself={false}
                            addPositionOfSignature={addPositionOfSignature}
                            initial={true}
                            isPlaceHolderSign={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <ModalUi
          isOpen={isAlreadyPlace.status}
          title={t("document-alert")}
          showClose={false}
        >
          <div className="h-[100%] p-[20px]">
            <p>{isAlreadyPlace.message}</p>
            <div className="h-[1px] w-full my-[15px] bg-[#9f9f9f]"></div>
            <button
              onClick={() => handleRecipientSign()}
              type="button"
              className="op-btn op-btn-primary"
            >
              {t("view")}
            </button>
          </div>
        </ModalUi>
        {(isAddSigner || (isAddUser && isAddUser[uniqueId])) && (
          <LinkUserModal
            handleAddUser={handleAddUser}
            uniqueId={uniqueId}
            closePopup={closePopup}
            signersData={signersdata}
            signerPos={signerPos}
          />
        )}
        <WidgetNameModal
          signatureType={signatureType}
          widgetName={widgetName}
          defaultdata={currWidgetsDetails}
          isOpen={isNameModal}
          handleClose={handleNameModal}
          handleData={handleWidgetdefaultdata}
          isTextSetting={isTextSetting}
          setIsTextSetting={setIsTextSetting}
          fontSize={fontSize}
          setFontSize={setFontSize}
          fontColor={fontColor}
          setFontColor={setFontColor}
        />
        <RotateAlert
          showRotateAlert={showRotateAlert.status}
          setShowRotateAlert={setShowRotateAlert}
          handleRemoveWidgets={handleRemovePlaceholder}
        />
      </DndProvider>
      {isWalletModalOpen && (
        <ModalUi isOpen={isWalletModalOpen} handleClose={() => {
          // setIsWalletModalOpen(false);
          navigate("/dashboard/35KBoSgoAK"); // Redirect to the dashboard
        }} 
        showClose={true}>
          <div className="p-4 flex flex-col items-center">
            <img src={EmptyWalletImage} alt="Empty Wallet" className="w-32 h-auto mb-4" />
            <p className="text-xl font-semibold">Your wallet is empty</p>
            <button onClick={handleAddCredits} className="op-btn op-btn-primary mt-2 text-lg text-white">
              Add Credits
            </button>
          </div>
        </ModalUi>
      )}
    </>
  );
}

export default PlaceHolderSign;
