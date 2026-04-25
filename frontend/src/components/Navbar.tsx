import { Link } from "react-router-dom";
import { Button } from "./ui/button";

function Navbar() {
  return (
    <header className="flex justify-between items-center py-5 px-6 md:px-12 lg:px-20 border-b border-slate-100">
      <div className="text-2xl font-bold text-slate-900 tracking-tight">
        Gigly
      </div>
      <nav className="hidden md:flex space-x-8 text-sm font-medium">
        <Link
          to="/login"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          post a gig
        </Link>
        <Link
          to="/login"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          Find gig
        </Link>
        <Link
          to="/login"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          How it Works
        </Link>
        <Link
          to="/login"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          Pricing
        </Link>
      </nav>
      <div className="flex space-x-4">
        <Link to="/login">
          <Button variant="outline" className="font-medium px-6 hidden sm:flex">
            Log In
          </Button>
        </Link>
        <Link to="/signup">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
            Sign up
          </Button>
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
