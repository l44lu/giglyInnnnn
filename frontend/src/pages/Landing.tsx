import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "../components/Navbar";
import {
  Search,
  Users,
  CheckCircle,
  Handshake,
  CreditCard,
  MapPin,
  Package,
  Headphones,
  Calendar,
  Wrench,
  FileText,
  Monitor,
  Building2,
} from "lucide-react";

const Landing = () => {
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
        <section className="px-6 md:px-12 lg:px-20 py-12 lg:py-20 flex flex-col lg:flex-row items-center gap-16 bg-white">
          <div className="w-full lg:w-1/2 space-y-8">
            <div className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Over 10,000 gigs available today
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Now connecting is <br className="hidden xl:block" /> easier than
              ever <br className="hidden xl:block" /> before.
            </h1>

            <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
              The on-demand micro-services marketplace for local and remote
              gigs. Hire fast, work flexibly, and get things done today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-grow shadow-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  className="pl-11 h-14 w-full rounded-lg border-slate-200 text-base focus-visible:ring-blue-500"
                  placeholder="Search for gigs, skills, or categories..."
                />
              </div>
              <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-semibold shadow-sm">
                Search
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-lg text-base font-medium">
                Post a Gig
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 rounded-lg text-base font-medium border-slate-300"
              >
                Find Work
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <div className="flex -space-x-3">
                <img
                  src="https://i.pravatar.cc/100?img=33"
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <img
                  src="https://i.pravatar.cc/100?img=47"
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <img
                  src="https://i.pravatar.cc/100?img=12"
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <img
                  src="https://i.pravatar.cc/100?img=41"
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
              </div>
              <div className="text-sm">
                <div className="text-slate-500 mb-0.5">
                  Trusted by 50,000+ users
                </div>
                <div className="text-slate-900 font-semibold flex items-center gap-1.5">
                  <div className="flex text-yellow-400 text-sm tracking-tighter">
                    ★★★★★
                  </div>
                  4.8/5 Average Rating
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/brooke-cagle-UYaBqDP6JoY-unsplash.jpg"
                alt="People working in modern office"
                className="w-full h-auto max-h-[600px] object-cover"
              />
            </div>
          </div>
        </section>

        {/* How our marketplace works Section */}
        <section className="px-6 md:px-12 lg:px-20 py-24 bg-[#f4f7fb]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How our marketplace works
            </h2>
            <p className="text-slate-500">
              Get started in minutes whether you need an extra hand for the day
              or want to earn extra cash.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Search className="text-white h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                1. Post or Search
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Companies post short-term gigs instantly. Workers browse local
                and remote opportunities that fit their schedule.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Users className="text-white h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                2. Match & Connect
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our smart algorithm connects the right talent with the right
                task. Chat, align on details, and get ready.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="text-white h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                3. Work & Get Paid
              </h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Complete the micro-service and receive secure, instant payments
                directly through the platform.
              </p>
            </div>
          </div>
        </section>

        {/* Simple, fast, and secure Section */}
        <section className="px-6 md:px-12 lg:px-20 py-24 bg-[#fafbfc]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Simple, fast, and secure.
            </h2>
            <p className="text-slate-500">
              We&apos;ve removed the friction from finding short-term help or
              securing your next gig.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <Search className="text-slate-700 h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                1. Search or Post
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Companies post a micro-gig in seconds. Workers browse available
                local or remote tasks instantly.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <Handshake className="text-slate-700 h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                2. Instant Match
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Our smart algorithm connects the right talent with the right
                opportunity based on skills and availability.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-10 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                <CreditCard className="text-slate-700 h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                3. Work & Get Paid
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Complete the task and payment is processed securely within 24
                hours. No invoices, no chasing.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Jobs Section */}
        <section className="px-6 md:px-12 lg:px-20 py-16 bg-[#fafbfc]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Featured Jobs
              </h2>
              <p className="text-slate-500 text-sm">
                Discover top opportunities available right now.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      React Developer
                    </h3>
                    <div className="flex items-center text-slate-500 text-xs mt-1.5">
                      <Building2 className="h-3 w-3 mr-1" />
                      Tech Corp Inc.
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Remote
                  </span>
                </div>
                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                  <div className="font-bold text-slate-900">
                    $90 - $120{" "}
                    <span className="text-slate-400 text-sm font-normal">
                      / hr
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Event Photographer
                    </h3>
                    <div className="flex items-center text-slate-500 text-xs mt-1.5">
                      <MapPin className="h-3 w-3 mr-1" />
                      New York, NY
                    </div>
                  </div>
                  <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Local
                  </span>
                </div>
                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                  <div className="font-bold text-slate-900">
                    $300{" "}
                    <span className="text-slate-400 text-sm font-normal">
                      / gig
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Virtual Assistant
                    </h3>
                    <div className="flex items-center text-slate-500 text-xs mt-1.5">
                      <Building2 className="h-3 w-3 mr-1" />
                      Startup Studio
                    </div>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Remote
                  </span>
                </div>
                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                  <div className="font-bold text-slate-900">
                    $20 - $35{" "}
                    <span className="text-slate-400 text-sm font-normal">
                      / hr
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-5"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Popular micro-services Section */}
        <section className="px-6 md:px-12 lg:px-20 py-16 bg-[#fafbfc]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Popular micro-services
              </h2>
              <p className="text-slate-500 text-sm">
                Explore tasks currently in demand on the platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Package className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Local Deliveries
                    </h4>
                    <p className="text-xs text-slate-400">
                      1,240 jobs available
                    </p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Local
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Calendar className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Event Staffing
                    </h4>
                    <p className="text-xs text-slate-400">800 jobs available</p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Local
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <FileText className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Data Entry
                    </h4>
                    <p className="text-xs text-slate-400">
                      3,100 jobs available
                    </p>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Remote
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Headphones className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Virtual Assistant
                    </h4>
                    <p className="text-xs text-slate-400">
                      2,090 jobs available
                    </p>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Remote
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Wrench className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      General Labor
                    </h4>
                    <p className="text-xs text-slate-400">610 jobs available</p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Local
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:border-slate-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Monitor className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Tech & IT Setup
                    </h4>
                    <p className="text-xs text-slate-400">420 jobs available</p>
                  </div>
                </div>
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Local
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="px-6 md:px-12 lg:px-20 py-20 bg-[#fafbfc]">
          <div className="max-w-6xl mx-auto bg-[#1877F2] rounded-[2rem] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-xl overflow-hidden relative">
            <div className="relative z-10 md:w-2/3">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Ready to dive in?
              </h2>
              <p className="text-blue-100 text-lg md:text-xl max-w-xl">
                Join thousands of workers and companies already connecting on
                GigConnect.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Button className="bg-white text-[#1877F2] hover:bg-slate-50 h-12 px-8 rounded-lg text-base font-bold whitespace-nowrap">
                Find a Gig
              </Button>
              <Button
                variant="outline"
                className="border-blue-400 text-white hover:bg-[#0c59be] hover:text-white hover:border-[#0c59be] h-12 px-8 rounded-lg text-base font-bold whitespace-nowrap bg-transparent"
              >
                Post a Gig
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white py-10 px-6 md:px-12 lg:px-20 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Gigly. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
};

export default Landing;
