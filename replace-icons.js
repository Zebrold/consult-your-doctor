import fs from 'fs';

const files = [
  'app/page.tsx',
  'components/Footer.tsx'
];

const iconMap = {
  'stethoscope': 'Stethoscope',
  'health_and_safety': 'ShieldPlus',
  'workspace_premium': 'Award',
  'devices': 'MonitorSmartphone',
  'expand_more': 'ChevronDown',
  'search': 'Search',
  'calendar_today': 'Calendar',
  'schedule': 'Clock',
  'person': 'User',
  'apartment': 'Building2',
  'medical_services': 'BriefcaseMedical',
  'location_on': 'MapPin',
  'info': 'Info',
  'star': 'Star',
  'medical_information': 'ClipboardList',
  'favorite': 'Heart',
  'psychology': 'Brain',
  'orthopedics': 'Bone',
  'child_care': 'Baby',
  'spa': 'Sparkles',
  'pregnant_woman': 'Baby',
  'chevron_right': 'ChevronRight',
  'chevron_left': 'ChevronLeft',
  'arrow_forward': 'ArrowRight',
  'local_hospital': 'Hospital',
  'verified': 'BadgeCheck',
  'add': 'Plus',
  'remove': 'Minus',
  'my_location': 'LocateFixed'
};

const regex = /<span className="material-symbols-outlined([^"]*)"(?:[^>]*)>\s*([a-z_]+)\s*<\/span>/g;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let iconsUsed = new Set();
  
  content = content.replace(regex, (match, classes, iconName) => {
    const lucideIcon = iconMap[iconName] || 'HelpCircle';
    iconsUsed.add(lucideIcon);
    // Ensure we keep the original classes, just mapping text sizing generally
    // text-3xl -> w-8 h-8
    // text-4xl -> w-10 h-10
    // text-xl -> w-6 h-6
    // text-lg -> w-5 h-5
    // text-sm -> w-4 h-4
    // etc.
    let newClasses = classes.trim();
    if (newClasses.includes('text-4xl')) newClasses = newClasses.replace('text-4xl', 'w-10 h-10');
    else if (newClasses.includes('text-3xl')) newClasses = newClasses.replace('text-3xl', 'w-8 h-8');
    else if (newClasses.includes('text-2xl')) newClasses = newClasses.replace('text-2xl', 'w-6 h-6');
    else if (newClasses.includes('text-xl')) newClasses = newClasses.replace('text-xl', 'w-5 h-5');
    else if (newClasses.includes('text-lg')) newClasses = newClasses.replace('text-lg', 'w-5 h-5');
    else if (newClasses.includes('text-sm')) newClasses = newClasses.replace('text-sm', 'w-4 h-4');
    else if (newClasses.includes('text-xs')) newClasses = newClasses.replace('text-xs', 'w-3 h-3');
    else newClasses += ' w-5 h-5';
    
    return `<${lucideIcon} className="${newClasses.trim()}" />`;
  });
  
  // Add imports
  if (iconsUsed.size > 0) {
    const importStr = `import { ${Array.from(iconsUsed).join(', ')} } from "lucide-react";\n`;
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfImport = content.indexOf('\n', lastImportIndex) + 1;
      content = content.slice(0, endOfImport) + importStr + content.slice(endOfImport);
    } else {
      content = importStr + content;
    }
  }
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
