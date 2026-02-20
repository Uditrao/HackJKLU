"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "4rem" }}>
      <h1>लॉगिन पेज</h1>
      <p>कृपया साइन इन करने के लिए नीचे क्लिक करें:</p>
      <button style={{ marginTop: "2rem" }} onClick={() => signIn("google")}>
        Google से लॉगिन करें
      </button>
    </div>
  );
}
