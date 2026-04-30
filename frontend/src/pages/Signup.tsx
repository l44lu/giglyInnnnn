import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, UserCircle, Mail } from "lucide-react";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "WORKER",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/register`,
        formData,
      );
      const data = response.data as { id: string };
      alert("Registration Successful! User ID: " + data.id);
    } catch (error) {
      console.error(error);
      alert("Registration Failed. Check terminal.");
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
              Work when needed.
              <br />
              Earn when it matters.
            </h1>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Join thousands of professionals finding local and remote gigs
              every single day. Work flexibly, earn more.
            </p>
          </div>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-16 relative bg-[#f8fafc]">
        {/* Top Toggle */}
        <div className="flex justify-center lg:justify-end w-full mb-12">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link to="/signup">
              <button className="px-6 py-2 bg-white rounded-md text-sm font-medium shadow-sm text-slate-900">
                Sign up
              </button>
            </Link>
            <Link to="/login">
              <button className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
                Log in
              </button>
            </Link>
          </div>
        </div>

        <div className="w-full max-w-[440px] mx-auto space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Gigly
            </span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your details below to get started on Gigly.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-slate-700 text-sm font-semibold"
                >
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  required
                  className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-slate-700 text-sm font-semibold"
                >
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  required
                  className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-slate-700 text-sm font-semibold "
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
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                required
                className="bg-white border-slate-200 focus-visible:ring-blue-500 h-11"
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div className="pt-2">
              <Label className="text-slate-700 text-sm font-semibold block">
                How do you want to use Gigly?
              </Label>
              <div className="grid grid-cols-2 gap-4 mt-[15px]">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "WORKER" })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "WORKER"
                      ? "border-blue-500 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <UserCircle
                    className={`w-6 h-6 mb-2 ${formData.role === "WORKER" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-semibold">
                    I&apos;m a Worker
                  </span>
                  <span className="text-xs text-center mt-1 opacity-80">
                    Looking for gigs
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, role: "RECRUITER" })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                    formData.role === "RECRUITER"
                      ? "border-blue-500 bg-blue-50/50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <Building2
                    className={`w-6 h-6 mb-2 ${formData.role === "RECRUITER" ? "text-blue-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-semibold">
                    I&apos;m a Recruiter
                  </span>
                  <span className="text-xs text-center mt-1 opacity-80">
                    Hiring talent
                  </span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
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

            <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
              By clicking continue, you agree to our{" "}
              <a href="#" className="underline hover:text-slate-700">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-slate-700">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
