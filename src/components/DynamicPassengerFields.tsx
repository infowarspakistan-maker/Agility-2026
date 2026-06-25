import { PackageType, Passenger } from '@/src/types';

interface DynamicPassengerFieldsProps {
  packageType: PackageType;
  passenger: Passenger;
  onChange: (field: string, value: string | number) => void;
}

export default function DynamicPassengerFields({ packageType, passenger, onChange }: DynamicPassengerFieldsProps) {
  if (packageType === 'study-abroad') {
    return (
      <>
        <div className="col-span-full md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Program Level</label>
          <select 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
            value={passenger.studyProgram || "Bachelor's"}
            onChange={(e) => onChange('studyProgram', e.target.value)}
          >
            <option value="Bachelor's">Bachelor's</option>
            <option value="Master's">Master's</option>
            <option value="PhD">PhD</option>
            <option value="Diploma">Diploma</option>
          </select>
        </div>
        <div className="col-span-full md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Field of Study</label>
          <select 
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
            value={passenger.studyField || 'IT'}
            onChange={(e) => onChange('studyField', e.target.value)}
          >
            <option value="IT">IT</option>
            <option value="AI">AI</option>
            <option value="Medical">Medical</option>
            <option value="Engineering">Engineering</option>
            <option value="Business">Business</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="col-span-full">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Background</label>
          <textarea 
            rows={2}
            placeholder="Previous degrees, institutions, and grades"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
            value={passenger.academicBackground || ''}
            onChange={(e) => onChange('academicBackground', e.target.value)}
          />
        </div>
      </>
    );
  }

  if (packageType === 'corporate' || packageType === 'expo') {
    return (
      <>
        <div className="col-span-full md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
          <input 
            type="text" 
            placeholder="Enter company name"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
            value={passenger.companyName || ''}
            onChange={(e) => onChange('companyName', e.target.value)}
          />
        </div>
        <div className="col-span-full md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Designation</label>
          <input 
            type="text" 
            placeholder="e.g. CEO, Manager"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20"
            value={passenger.designation || ''}
            onChange={(e) => onChange('designation', e.target.value)}
          />
        </div>
        {packageType === 'expo' && (
          <div className="col-span-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Exhibitor Profile</label>
            <textarea 
              rows={2}
              placeholder="Briefly describe your company's focus and what you plan to exhibit or seek at the expo"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
              value={passenger.exhibitorProfile || ''}
              onChange={(e) => onChange('exhibitorProfile', e.target.value)}
            />
          </div>
        )}
      </>
    );
  }

  if (packageType === 'umrah' || packageType === 'haj') {
    return (
      <div className="col-span-full">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Travel History</label>
        <textarea 
          rows={2}
          placeholder="Previous Umrah/Haj travel history (if any)"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
          value={passenger.travelHistory || ''}
          onChange={(e) => onChange('travelHistory', e.target.value)}
        />
      </div>
    );
  }

  return null;
}
