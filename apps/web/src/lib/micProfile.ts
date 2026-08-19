/** Classify mic from OS label + tips for Smart Session (earbuds, headset, built-in, etc.). */

export type MicProfile = "earbuds" | "headset" | "builtin" | "usb" | "bluetooth" | "unknown";

export function classifyMic(label: string): MicProfile {
  const low = (label || "").toLowerCase();
  if (
    /airpods|earbud|buds|galaxy buds|pixel buds|beats fit|nothing ear|oneplus buds/.test(low)
  ) {
    return "earbuds";
  }
  if (/headset|headphone|jabra|logitech|hyperx|steelseries|plantronics|poly/.test(low)) {
    return "headset";
  }
  if (/built-?in|internal|array|realtek|microphone array|laptop/.test(low)) {
    return "builtin";
  }
  if (/bluetooth|bt |wireless/.test(low)) {
    return "bluetooth";
  }
  if (/usb|xlr|rode|shure|blue yeti|fifine|maono|boya|dji|hollyland|audio interface/.test(low)) {
    return "usb";
  }
  return "unknown";
}

export function micProfileLabel(profile: MicProfile): string {
  switch (profile) {
    case "earbuds":
      return "Earbuds";
    case "headset":
      return "Headset";
    case "builtin":
      return "Built-in mic";
    case "usb":
      return "USB / pro mic";
    case "bluetooth":
      return "Bluetooth";
    default:
      return "Microphone";
  }
}

export function micTips(profile: MicProfile): string[] {
  switch (profile) {
    case "earbuds":
      return [
        "Keep buds seated — mic is on the stem; don't cover it with hair or a collar.",
        "Avoid cable rub and wind; stay within arm's length for calls.",
        "Use the same earbuds for Smart Session and Voice Labs so scores compare fairly.",
      ];
    case "headset":
      return [
        "Boom mic ~2 fingers from mouth corner, slightly off-axis to reduce pops.",
        "Great for long Smart Sessions — stable distance beats laptop built-ins.",
        "If you switch to earbuds later, re-run a quick drill to recalibrate.",
      ];
    case "builtin":
      return [
        "Sit closer than you think — built-ins pick up keyboard and fan noise.",
        "Face the laptop; don't turn away mid-sentence.",
        "Earbuds or a headset will improve clarity a lot for verdict accuracy.",
      ];
    case "bluetooth":
      return [
        "Watch for dropouts — if level bars freeze, switch to wired backup.",
        "Some BT codecs add latency; pause slightly longer between thoughts.",
        "Set preferred device in settings so reconnects auto-switch.",
      ];
    case "usb":
      return [
        "USB mics love consistency — same position for listen + drill.",
        "Reduce room echo; soft furnishings help executive presence scores.",
      ];
    default:
      return [
        "Pick one mic for the whole day — Smart Session + drills should match.",
        "Check input level bars before starting; aim for steady green, not clipping.",
      ];
  }
}
