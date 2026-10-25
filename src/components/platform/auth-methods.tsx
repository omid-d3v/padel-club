"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  requestPhoneCode,
  verifyPhoneCode,
  signInPhonePassword,
  completePhoneProfile,
  setPhonePassword,
} from "@/app/phone-auth-actions";
import {
  authDestination,
  type AuthProfile,
  type PhoneAuthResult,
} from "@/lib/auth-flow";
import { SKILLS } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = "phone" | "code" | "profile" | "password";
export function AuthMethods({
  signup = false,
  next,
  phoneEnabled = false,
  onAuthenticated,
  cities = [],
  initialProfileRequired = false,
  initialPhone = "",
  recovery = false,
}: {
  signup?: boolean;
  next?: string;
  phoneEnabled?: boolean;
  onAuthenticated?: () => void;
  cities?: { id: string; name: string }[];
  initialProfileRequired?: boolean;
  initialPhone?: string;
  recovery?: boolean;
}) {
  const [mode, setMode] = useState<"otp" | "password">(
    phoneEnabled || signup || recovery ? "otp" : "password",
  );
  const [stage, setStage] = useState<Stage>(
    initialProfileRequired ? "profile" : "phone",
  );
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [withPassword, setWithPassword] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | undefined>();
  const [pending, start] = useTransition();
  const focus = useRef<HTMLInputElement>(null);
  const codeId = useId();
  const router = useRouter();
  useEffect(() => {
    focus.current?.focus({ preventScroll: true });
  }, [stage]);
  useEffect(() => {
    if (!retryAt) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);
  const navigate = (result: PhoneAuthResult) => {
    if (onAuthenticated) {
      onAuthenticated();
      return;
    }
    router.replace(authDestination(next, result.redirect === "/admin"));
    router.refresh();
  };
  const receive = (result: PhoneAuthResult, verified = false) => {
    setMessage(result.message);
    setFailed(!result.success);
    if (!result.success) return;
    if (result.needsProfile) {
      setProfile(result.profile);
      setStage("profile");
    } else if (recovery && verified) {
      setStage("password");
      setMessage("شماره تأیید شد؛ رمز تازه را انتخاب کنید.");
    } else navigate(result);
  };
  const sendCode = async () => {
    const result = await requestPhoneCode(phone, signup, accepted);
    setMessage(result.message);
    setFailed(!result.success);
    if (result.success) {
      setStage("code");
      setRetryAt(Date.now() + 60000);
    }
  };
  const stageIndex =
    stage === "profile" || stage === "password" ? 2 : stage === "code" ? 1 : 0;
  const label =
    stage === "profile"
      ? "تکمیل اطلاعات و ادامه"
      : stage === "password"
        ? "ذخیره رمز و ورود"
        : stage === "code"
          ? "تأیید کد و ادامه"
          : mode === "password"
            ? "ورود به حساب"
            : "دریافت کد تأیید";
  return (
    <div
      className="phone-auth"
      aria-label={recovery ? "بازیابی رمز با موبایل" : "ورود و عضویت با موبایل"}
    >
      <ol className="auth-steps" aria-label="مراحل ورود">
        {[
          "شماره موبایل",
          "تأیید هویت",
          recovery ? "رمز تازه" : "اطلاعات بازی",
        ].map((text, index) => (
          <li
            key={text}
            aria-current={stageIndex === index ? "step" : undefined}
            data-complete={index < stageIndex}
          >
            <span aria-hidden="true">
              {index < stageIndex ? <Check size={13} /> : index + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
      {stage === "phone" && !signup && !recovery && (
        <div className="auth-methods" role="group" aria-label="روش ورود">
          <button
            type="button"
            aria-pressed={mode === "otp"}
            disabled={pending || !phoneEnabled}
            onClick={() => {
              setMode("otp");
              setMessage("");
            }}
          >
            کد یک‌بارمصرف
          </button>
          <button
            type="button"
            aria-pressed={mode === "password"}
            disabled={pending}
            onClick={() => {
              setMode("password");
              setMessage("");
            }}
          >
            ورود با رمز
          </button>
        </div>
      )}
      {(stage === "code" || stage === "profile" || stage === "password") && (
        <div className="auth-identity">
          <ShieldCheck size={19} aria-hidden="true" />
          <span>
            {stage === "code"
              ? "کد برای این شماره ارسال شد"
              : "هویت شما تأیید شد"}
            {phone && <b dir="ltr">{phone}</b>}
          </span>
          {stage === "code" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setStage("phone");
                setMessage("");
              }}
            >
              ویرایش شماره
            </button>
          )}
        </div>
      )}
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setMessage("");
          start(async () => {
            try {
              if (stage === "phone") {
                if (mode === "password" && !signup && !recovery)
                  receive(
                    await signInPhonePassword(
                      phone,
                      String(form.get("password") ?? ""),
                    ),
                  );
                else await sendCode();
              } else if (stage === "code")
                receive(
                  await verifyPhoneCode(phone, String(form.get("code") ?? "")),
                  true,
                );
              else if (stage === "profile")
                receive(
                  await completePhoneProfile({
                    displayName: String(form.get("displayName") ?? ""),
                    skillLevel: String(form.get("skillLevel") ?? ""),
                    cityId: form.get("cityId") || null,
                    password:
                      withPassword || recovery
                        ? String(form.get("password") ?? "")
                        : "",
                    passwordConfirmation:
                      withPassword || recovery
                        ? String(form.get("passwordConfirmation") ?? "")
                        : "",
                  }),
                );
              else
                receive(
                  await setPhonePassword(
                    String(form.get("password") ?? ""),
                    String(form.get("passwordConfirmation") ?? ""),
                  ),
                );
            } catch {
              setFailed(true);
              setMessage("ارتباط برقرار نشد؛ دوباره تلاش کنید.");
            }
          });
        }}
      >
        <fieldset disabled={pending} className="contents">
          {stage === "phone" && (
            <>
              <label className="auth-field">
                شماره موبایل ایران
                <span className="auth-input-icon">
                  <Smartphone size={19} aria-hidden="true" />
                  <Input
                    ref={focus}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="09123456789"
                  />
                </span>
              </label>
              {mode === "password" && !signup && !recovery && (
                <label className="auth-field">
                  رمز عبور
                  <span className="auth-password">
                    <Input
                      name="password"
                      aria-label="رمز عبور"
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      autoComplete="current-password"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </span>
                </label>
              )}
              <p className="auth-hint">
                {recovery
                  ? "شماره حساب خود را تأیید کنید، سپس رمز تازه بسازید."
                  : signup
                    ? "شماره را تأیید کنید و همین‌جا اطلاعات بازی خود را تکمیل کنید."
                    : mode === "otp"
                      ? "برای ورود با کد، نیازی به رمز ندارید."
                      : "با شماره موبایل و رمز حساب خود وارد شوید."}
              </p>
              {signup && (
                <label className="auth-consent">
                  <input
                    name="acceptedTerms"
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span>
                    با{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      قوانین
                    </Link>{" "}
                    و{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      حریم خصوصی
                    </Link>{" "}
                    موافقم.
                  </span>
                </label>
              )}
              {!phoneEnabled && (mode === "otp" || signup || recovery) && (
                <p role="status" className="auth-hint">
                  ارسال کد پیامکی فعلاً در دسترس نیست؛ کمی بعد دوباره تلاش کنید.
                </p>
              )}
            </>
          )}
          {stage === "code" && (
            <div className="auth-field">
              <label htmlFor={codeId}>کد تأیید</label>
              <Input
                id={codeId}
                aria-describedby={`${codeId}-hint`}
                ref={focus}
                className="auth-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                minLength={6}
                maxLength={10}
                required
                placeholder="······"
              />
              <span id={`${codeId}-hint`} className="auth-hint">
                کد پیامک‌شده را وارد کنید. اعداد فارسی و انگلیسی پذیرفته
                می‌شوند.
              </span>
            </div>
          )}
          {stage === "profile" && (
            <>
              <div className="auth-step-heading">
                <h2>بازی را با شناخت تو شروع کنیم</h2>
                <p>
                  این اطلاعات فقط یک بار لازم است. سطح بازی را خودت انتخاب کن.
                </p>
              </div>
              <label className="auth-field">
                نام و نام خانوادگی
                <Input
                  ref={focus}
                  name="displayName"
                  autoComplete="name"
                  defaultValue={profile?.displayName ?? ""}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label className="auth-field">
                سطح بازی
                <select
                  name="skillLevel"
                  defaultValue={profile ? String(profile.skillLevel) : ""}
                  required
                >
                  <option value="" disabled>
                    سطح خود را انتخاب کنید
                  </option>
                  {SKILLS.map((skill, index) => (
                    <option key={skill} value={index}>
                      {skill}
                      {index === 0
                        ? " · تازه‌کار"
                        : index === 5
                          ? " · پیشرفته"
                          : ""}
                    </option>
                  ))}
                </select>
              </label>
              {cities.length > 0 && (
                <label className="auth-field">
                  شهر{" "}
                  <span className="font-normal text-muted-foreground">
                    (اختیاری)
                  </span>
                  <select name="cityId" defaultValue={profile?.cityId ?? ""}>
                    <option value="">بعداً انتخاب می‌کنم</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!recovery && (
                <label className="auth-consent">
                  <input
                    type="checkbox"
                    checked={withPassword}
                    onChange={(e) => setWithPassword(e.target.checked)}
                  />
                  <span>
                    برای ورودهای بعدی رمز هم تعیین می‌کنم{" "}
                    <small>(اختیاری)</small>
                  </span>
                </label>
              )}
            </>
          )}
          {(stage === "password" ||
            (stage === "profile" && (withPassword || recovery))) && (
            <>
              <label className="auth-field">
                رمز جدید؛ حداقل ۱۰ کاراکتر
                <Input
                  ref={stage === "password" ? focus : undefined}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </label>
              <label className="auth-field">
                تکرار رمز جدید
                <Input
                  name="passwordConfirmation"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </label>
              <button
                type="button"
                className="auth-text-button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "پنهان کردن رمزها" : "نمایش رمزها"}
              </button>
            </>
          )}
          {message && (
            <p
              className={`auth-message ${failed ? "is-error" : ""}`}
              role={failed ? "alert" : "status"}
            >
              {message}
            </p>
          )}
          <Button
            className="auth-submit"
            disabled={
              pending ||
              (stage === "phone" &&
                (signup || recovery || mode === "otp") &&
                !phoneEnabled)
            }
          >
            {pending ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight size={18} aria-hidden="true" />
            )}
            {pending ? "در حال بررسی…" : label}
          </Button>
        </fieldset>
      </form>
      {stage === "code" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={pending || remaining > 0}
          onClick={() => {
            if (Date.now() < retryAt) return;
            start(async () => {
              try {
                await sendCode();
              } catch {
                setFailed(true);
                setMessage("ارسال مجدد انجام نشد؛ دوباره تلاش کنید.");
              }
            });
          }}
        >
          {remaining > 0
            ? `ارسال مجدد تا ${new Intl.NumberFormat("fa-IR").format(remaining)} ثانیه`
            : "ارسال مجدد کد"}
        </Button>
      )}
      {stage === "phone" && !signup && !recovery && mode === "password" && (
        <Link
          className="auth-text-link"
          href={`/forgot-password${next ? `?next=${encodeURIComponent(authDestination(next))}` : ""}`}
        >
          رمز را فراموش کرده‌ام؛ ورود با کد
        </Link>
      )}
    </div>
  );
}
