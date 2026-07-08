const checkAccessRules = (rules, attributeValues) => {
  for (const rule of rules) {
    const userValObj = attributeValues.find(
      (uv) => uv.attributeId === rule.attributeId,
    );
    const value = userValObj ? userValObj.value : "";

    switch (rule.operator) {
      case "EQUALS":
        if (value.toLowerCase() !== rule.value.toLowerCase()) return false;
        break;
      case "GREATER_THAN":
        if (Number(value) <= Number(rule.value)) return false;
        break;
      case "LESS_THAN":
        if (Number(value) >= Number(rule.value)) return false;
        break;
      case "CONTAINS":
        if (!value.toLowerCase().includes(rule.value.toLowerCase()))
          return false;
        break;
      case "IS_CHECKED":
        if (value !== "true") return false;
        break;

      default:
        break;
    }

    return true;
  }
};
