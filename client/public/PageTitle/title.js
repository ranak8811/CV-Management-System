import { useEffect } from "react";

function useTitle(path) {
  useEffect(() => {
    document.title = `${path} || something meaningful here`;
    return () => {};
  }, [path]);
}

export default useTitle;
