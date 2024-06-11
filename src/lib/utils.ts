export class is {
  static num(target: any) {
    return typeof target === "number";
  }

  static bool(target: any) {
    return typeof target === "boolean";
  }

  static arr(target: any) {
    return Array.isArray(target);
  }
}

export class mt {
  static obj(target: any) {
    for (let _ in target) {
      return false;
    }
    return true;
  }

  static str(target: any) {
    return !target || target.length === 0;
  }

  static arr(target: any) {
    return Array.isArray(target) && target.length === 0;
  }
}

export class strOps {
  // Convert normal string to template literal
  static literal(str: string, values: Record<string, any>) {
    //? values.key can accept anything.
    return str.replace(/\$\{(\w+)\}/g, (_: any, v: string) => {
      if (values.hasOwnProperty(v) && !mt.str(values[v])) {
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
