import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./providers/AuthProvider";
import { router } from "./router/router";
import { Toaster } from "react-hot-toast";

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <RouterProvider router={router} />

        <Toaster position="top-center" reverseOrder={false} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
