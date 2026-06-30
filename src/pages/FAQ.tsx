import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Landmark, ShieldCheck, Map, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: any;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    title: 'Umrah & Haj',
    icon: Landmark,
    items: [
      {
        question: 'What is the required passport validity for Umrah?',
        answer: 'Your passport must be valid for at least 6 months from your date of departure. We also recommend having at least two blank pages for visa stamping.'
      },
      {
        question: 'Are vaccinations mandatory for religious travel?',
        answer: 'Yes, Meningococcal (Meningitis) vaccination is mandatory. Depending on current health advisories, COVID-19 or Polio vaccinations may also be required. We will provide the latest requirements upon booking.'
      },
      {
        question: 'Can I perform Umrah alone or do I need a group?',
        answer: 'We offer both group and private Umrah packages. Group packages are more cost-effective and include guided tours, while private packages offer more flexibility and personalized transport.'
      }
    ]
  },
  {
    title: 'Visa Services',
    icon: ShieldCheck,
    items: [
      {
        question: 'What documents are needed for a Saudi Tourist Visa?',
        answer: 'Typically, we require a clear scanned copy of your passport (first two pages), a white background photograph, and your CNIC copy. For certain nationalities, additional proof of residence or employment may be requested.'
      },
      {
        question: 'How long does visa processing take?',
        answer: 'Saudi E-visas are usually processed within 3-5 working days. Regular Umrah visas may take 7-10 days depending on the Saudi Consulate load.'
      }
    ]
  },
  {
    title: 'Domestic Pakistan Tours',
    icon: Map,
    items: [
      {
        question: 'Is it safe to travel to Northern Pakistan?',
        answer: 'Yes, areas like Hunza, Skardu, and Naran are very safe for tourists. We provide experienced local drivers and choose verified hotels to ensure your safety and comfort.'
      },
      {
        question: 'What should I pack for a Hunza/Skardu trip?',
        answer: 'Even in summer, nights can be cold. Pack layers, sturdy walking shoes, sunblock, and any specific personal medications. For winter trips, heavy woollens and thermal wear are essential.'
      }
    ]
  },
  {
    title: 'Booking & Payments',
    icon: Clock,
    items: [
      {
        question: 'What are the available payment methods?',
        answer: 'We accept direct bank transfers to our HBL account, Easypaisa, JazzCash, and cash payments at our Lahore branch. We are currently working on integrating online Credit/Debit card payments.'
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'Cancellations 30 days before departure are eligible for a 75% refund. 15-30 days receive 50%. Cancellations within 15 days of departure or non-refundable bookings (like certain flight deals) may not be eligible for a refund. Please check specific package terms.'
      }
    ]
  }
];

function AccordionItem({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex justify-between items-center text-left hover:text-orange-500 transition-colors group"
      >
        <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.question}</span>
        <ChevronDown 
          className={cn(
            "text-slate-300 transition-transform duration-300 shrink-0 ml-4",
            isOpen && "rotate-180 text-orange-500"
          )} 
          size={20} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-500 leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="pt-32 pb-20 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-16">
         <motion.div 
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
         >
            <HelpCircle size={32} />
         </motion.div>
         <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked <span className="text-orange-500">Questions</span></h1>
         <p className="text-slate-500 max-w-md mx-auto">Everything you need to know about your next spiritual or leisure journey with Agility Travels.</p>
      </div>

      <div className="space-y-12">
        {FAQ_DATA.map((section, sIdx) => (
          <div key={section.title} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10">
            <div className="flex items-center space-x-4 mb-8">
               <div className="p-3 bg-slate-50 rounded-xl text-orange-500">
                  <section.icon size={24} />
               </div>
               <h3 className="text-xl font-bold">{section.title}</h3>
            </div>
            
            <div className="divide-y divide-slate-50">
               {section.items.map((item, iIdx) => {
                 const id = `${sIdx}-${iIdx}`;
                 return (
                   <div key={id}>
                     <AccordionItem 
                      item={item} 
                      isOpen={openIndex === id} 
                      onClick={() => toggle(id)} 
                     />
                   </div>
                 );
               })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-slate-900 rounded-[2.5rem] p-10 text-center text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
         <div className="relative z-10">
           <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
           <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm">Our travel experts are available on WhatsApp 24/7 to help you with your specific queries.</p>
           <a 
            href="https://wa.me/923154256263" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
           >
             <span>Chat on WhatsApp</span>
           </a>
         </div>
      </div>
    </div>
  );
}
