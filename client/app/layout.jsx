import "../styles/globals.css";

export const metadata = {
  title: "Smart Clinic Login",
  description: "Smart Clinic Queue Management System"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
