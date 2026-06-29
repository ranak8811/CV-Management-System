import useAuth from "../../hooks/useAuth";
import useLanguage from "../../hooks/useLanguage";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">{t("congratulations")}</h3>
      <div className="bg-base-200 p-6 border border-base-300 rounded-lg max-w-lg">
        <p className="text-base-content mb-4">{t("successMessage")}</p>
        <div className="text-sm text-gray-500">
          {t("emailLabel")}:{" "}
          <strong className="text-base-content">{user?.email}</strong>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
