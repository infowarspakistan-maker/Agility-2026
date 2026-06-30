import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin, Plane, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Plane className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                Agility <span className="text-orange-500">Travels</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-slate-400">
              Premium travel agency specializing in spiritual journeys, visa assistance, and scenic tours across Pakistan. Experience the world with Agility.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-800 rounded-full hover:bg-orange-500 hover:text-white transition-all">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold">Discovery</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/packages/umrah" className="hover:text-orange-500 transition-colors">Umrah Packages</Link></li>
              <li><Link to="/packages/haj" className="hover:text-orange-500 transition-colors">Haj 2026 Registry</Link></li>
              <li><Link to="/packages/domestic-group" className="hover:text-orange-500 transition-colors">Northern Pakistan</Link></li>
              <li><Link to="/packages/visa" className="hover:text-orange-500 transition-colors">Visa Services</Link></li>
              <li><Link to="/blog" className="hover:text-orange-500 transition-colors">Blogs</Link></li>
              <li><Link to="/news" className="hover:text-orange-500 transition-colors">News</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-orange-500 transition-colors">FAQs & Requirements</Link></li>
              <li><Link to="/placeholder/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link></li>
              <li><Link to="/placeholder/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-orange-500 shrink-0 mt-0.5" />
                <span>Johar Town, Lahore, Pakistan</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-orange-500 shrink-0" />
                <span>0320 500 4446 (Call)</span>
              </li>
              <li className="flex items-center space-x-3">
                <MessageCircle size={18} className="text-green-500 shrink-0" />
                <span>0315 425 6263 (WhatsApp)</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-orange-500 shrink-0" />
                <span>contact@agilitytravels.pk</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Agility Travels (Pvt) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
