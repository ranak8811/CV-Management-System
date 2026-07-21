import { useEffect } from "react";

function useTitle(title) {
  useEffect(() => {
    document.title = `${title} || CV Management System`;
  }, [title]);
}

export default useTitle;
