import { SKILLS } from "@/lib/platform/types";
import { SKILL_NAMES } from "@/lib/product";
export function SkillOptions() {
  return SKILLS.map((code, i) => (
    <option key={code} value={i}>
      {code} · {SKILL_NAMES[i]}
    </option>
  ));
}
export function SkillHelp() {
  return (
    <p className="text-sm leading-7 text-muted-foreground">
      سطح را بر اساس بازی معمول خودت انتخاب کن؛ خوداظهاری است. نشان تأیید پس از
      ارزیابی مدیر داده می‌شود. اگر مطمئن نیستی، از سطح مقدماتی شروع کن و از بخش
      پشتیبانی درخواست ارزیابی بده.
    </p>
  );
}
