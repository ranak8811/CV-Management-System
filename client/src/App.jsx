import { RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./providers/AuthProvider";
import { router } from "./router/router";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "./providers/LanguageProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <RouterProvider router={router} />

            <Toaster position="top-center" reverseOrder={false} />
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
