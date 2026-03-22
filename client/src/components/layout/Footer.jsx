import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E0E0E0] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-[#7E808C]">
          © 2026 Food Lagbe. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-[#7E808C] hover:text-[#E23744] transition-colors">About</Link>
          <Link to="/contact" className="text-sm text-[#7E808C] hover:text-[#E23744] transition-colors">Contact</Link>
          <Link to="/terms" className="text-sm text-[#7E808C] hover:text-[#E23744] transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
