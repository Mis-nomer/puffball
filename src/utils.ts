import { URL } from "node:url";
import { platform } from "node:os";

export class is {
  static mt(target: any, targetType: string) {
    switch (targetType) {
      case "object":
        for (let _ in target) {
          return false;
        }
        return true;
      case "string":
        return !target || target.length === 0;
      default:
        throw new Error("Invalid checking type, please enter a valid type");
    }
  }
  static OS = () => process.platform ?? platform();
}

// export const getId = (target: string) => {
//   if (!target.length) return "";

//   const nodeURL = new URL(target);
//   const params = nodeURL.searchParams;

//   return params.get("id");
// };

export class strOps {
  // Convert normal string to template literal
  static literal(str: string, values: Record<string, any>) {
    //? values.key can accept anything.
    return str.replace(/\$\{(\w+)\}/g, (_: any, v: string) => {
      if (values.hasOwnProperty(v) && !is.mt(values[v], "string")) {
        return values[v];
      } else {
        return "Not provided";
      }
    });
  }
  // Remove diacritics from string
  static plain(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}

export const nowTS = () => {
  const date = new Date();
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
    .replace(/\//g, "");
};
