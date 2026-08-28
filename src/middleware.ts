import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const path = nextUrl.pathname;

  if (path === "/login" || path.startsWith("/api/auth")) {
    if (isLoggedIn && path === "/login") {
      const target = role === "OPERATOR" ? "/dashboard" : "/my-cases";
      return NextResponse.redirect(new URL(target, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }

  const operatorOnly = ["/dashboard", "/cases", "/bodies", "/users", "/audit", "/settings"];
  const participantOnly = ["/my-cases"];

  if (operatorOnly.some((p) => path.startsWith(p)) && role !== "OPERATOR") {
    return NextResponse.redirect(new URL("/my-cases", nextUrl));
  }
  if (participantOnly.some((p) => path.startsWith(p)) && role === "OPERATOR") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (path === "/") {
    const target = role === "OPERATOR" ? "/dashboard" : "/my-cases";
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts).*)"],
};
