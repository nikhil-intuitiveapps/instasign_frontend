import React, { useEffect, useState } from "react";
import Parse from "parse";
import Title from "../components/Title";
import Loader from "../primitives/Loader";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const GenerateToken = () => {
  const { t } = useTranslation();
  const [apiToken, setApiToken] = useState("");
  const [isLoader, setIsLoader] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const apiBase = (() => {
    try {
      const serverUrl = (localStorage.getItem("baseUrl") || "").replace(/\/$/, "");
      // baseUrl is typically .../app — integration API lives at .../app/v1
      return serverUrl.endsWith("/app") ? `${serverUrl}/v1` : `${serverUrl}/app/v1`;
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchToken = async () => {
    setIsLoader(true);
    try {
      const res = await Parse.Cloud.run("getapitoken");
      setApiToken(res?.token || "");
    } catch (err) {
      console.log("getapitoken err", err);
      toast.error(err?.message || t("something-went-wrong-mssg"));
    } finally {
      setIsLoader(false);
    }
  };

  const handleGenerate = async () => {
    setShowConfirm(false);
    setIsGenerating(true);
    try {
      const res = await Parse.Cloud.run("generateapitoken");
      if (res?.token) {
        setApiToken(res.token);
        toast.success(t("token-generated"));
      } else {
        toast.error(t("something-went-wrong-mssg"));
      }
    } catch (err) {
      console.log("generateapitoken err", err);
      toast.error(err?.message || t("something-went-wrong-mssg"));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToken = async () => {
    if (!apiToken) return;
    try {
      await navigator.clipboard.writeText(apiToken);
      toast.success(t("copied"));
    } catch {
      toast.error(t("something-went-wrong-mssg"));
    }
  };

  return (
    <React.Fragment>
      <Title title={t("api-token")} />
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {isLoader ? (
        <div className="h-[100vh] flex justify-center items-center">
          <Loader />
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="bg-base-100 text-base-content shadow-md rounded-box w-full max-w-3xl p-5 md:p-8">
            <h1 className="text-xl font-semibold mb-2">{t("api-token")}</h1>
            <p className="text-sm opacity-80 mb-6">
              {t("help-api-token", {
                origin: apiBase || window.location.origin
              })}
            </p>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                {t("api-token")}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiToken || "—"}
                  className="op-input op-input-bordered w-full text-sm font-mono"
                />
                <button
                  type="button"
                  className="op-btn op-btn-primary"
                  disabled={!apiToken}
                  onClick={copyToken}
                >
                  {t("copy-code")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                className="op-btn op-btn-accent"
                disabled={isGenerating}
                onClick={() => {
                  if (apiToken) {
                    setShowConfirm(true);
                  } else {
                    handleGenerate();
                  }
                }}
              >
                {isGenerating
                  ? "..."
                  : apiToken
                    ? t("regenerate-token")
                    : t("generate-token")}
              </button>
            </div>

            <div className="mt-8 border-t border-base-300 pt-5">
              <h2 className="text-base font-semibold mb-2">
                Request signature (integration)
              </h2>
              <p className="text-sm opacity-80 mb-3">
                From another project, upload a PDF and receiver email with your
                API token. Pass <code>send=true</code> to email signers
                immediately. Pass <code>template_id</code> to reuse a saved
                field layout (offer letter, exit letter, etc.). Without a
                template, <code>prepare_url</code> is where fields can be
                placed.
              </p>
              <pre className="bg-base-200 rounded-box p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`POST ${apiBase || "https://dev.instasign.ai/app/v1"}/request-signature
Header: x-api-token: <your-token>

Single receiver (form-data):
file, email, name, phone, document_name, kyc_required, send_in_order
optional: template_id, role, send

send=true  → mark sent and email signers immediately (template_id optional)
send=false → create a draft; open prepare_url to place or review fields

With layout template (form-data):
file, template_id, receivers (JSON), document_name
send=true  → apply placeholders and email signers immediately
send=false → apply placeholders; open prepare_url to review then send

Multiple receivers (form-data):
file, receivers (JSON array), document_name, kyc_required, send_in_order
optional: template_id, send

receivers example (order maps to template roles, or use role names):
[{"email":"candidate@example.com","name":"Alice","role":"Candidate"},
 {"email":"hr@example.com","name":"HR Admin","role":"HR"}]

Resend signing email (JSON):
POST ${apiBase || "https://dev.instasign.ai/app/v1"}/resend-signature
Header: x-api-token: <your-token>
Body: { "document_id": "<id>", "email": "signer@example.com" }
(email is optional — omit to resend to all pending signers)

Health check:
GET ${apiBase || "https://dev.instasign.ai/app/v1"}/health`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="op-modal op-modal-open">
          <div className="op-modal-box">
            <h3 className="font-bold text-lg">{t("regenerate-token")}</h3>
            <p className="py-4">{t("generate-token-alert")}</p>
            <div className="op-modal-action">
              <button
                type="button"
                className="op-btn"
                onClick={() => setShowConfirm(false)}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                type="button"
                className="op-btn op-btn-primary"
                onClick={handleGenerate}
              >
                {t("yes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default GenerateToken;
