import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Mail } from "lucide-react";
import { Link } from "react-router";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // gotta move the url to .env file make sure to do it
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/login`,
        formData,
      );
      //=======================================================================================================================================
      //not a good practice to store the jwt in the localstorage so gotta change to Access token in memory + Refresh token in HttpOnly cookie
      //=======================================================================================================================================
      const data = response.data as {
        access_token: string;
        user: { firstName: string };
      };
      localStorage.setItem("token", data.access_token);

      alert("Login Successful! Welcome " + data.user.firstName);
    } catch (error) {
      console.error(error);
      alert("Login Failed. Check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      <div
        className="hidden lg:flex w-1/2 text-white flex-col justify-between p-12 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/signup-hero.png')" }}
      >
        <div className="absolute inset-0 bg-slate-900/60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tight">Gigly</span>
          </div>

          <div className="mt-auto pb-12">
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Welcome back.
              <br />
              Ready to work?
            </h1>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Log in to access your dashboard, discover new opportunities, and
              manage your current gigs.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-16 relative bg-[#f8fafc]">
        <div className="flex justify-center lg:justify-end w-full mb-12">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link to="/signup">
              <button className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                Sign up
              </button>
            </Link>
            <Link to="/login">
              <button className="px-6 py-2 bg-white rounded-md text-sm font-medium shadow-sm text-slate-900">
                Log in
              </button>
            </Link>
          </div>
        </div>

        <div className="w-full max-w-[440px] mx-auto space-y-8">
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Gigly
            </span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Log in to your account
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your credentials to access your account.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-5"
          >
            <div className="space-y-20">
              <Label
                htmlFor="email"
                className="text-slate-700 text-sm font-semibold"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-slate-700 text-sm font-semibold"
                >
                  Password
                </Label>
                <a
                  href="#"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>

            <div className="relative py-4 mt-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f8fafc] px-2 text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 font-medium"
            >
              <Mail className="w-4 h-4" />
              Email Link
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
