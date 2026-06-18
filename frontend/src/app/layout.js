import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SpesAttendance",
  description: "Spes Attendance Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@100..700,0..1,-50..200,20..48&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
