import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { utilSlugify } from '@/lib/utils';

export function useFiches(version?: string | number) {
  return useQuery({
    queryKey: ['fiches-md', version], 
    queryFn: async () => {
      console.log('📚 [useFiches] Loading fiches from storage, version:', version);
      
      try {
        // Try to get the current fiche filename from settings
        const { data: settingData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'current_file_fiches')
          .maybeSingle();
        
        const filename = settingData?.value || 'fiches-produits-FORMAT-V2.md';
        const filePath = filename;
        
        console.log('📄 [useFiches] Using file path:', filePath);
        
        const { data, error } = await supabase
          .storage.from('Fiches_produit')
          .download(filePath);
        
        if (error) {
          console.error('❌ [useFiches] Storage error:', error);
          console.log('📋 [useFiches] Falling back to database fiches...');
          
          // Fallback: use existing supplement_fiche table
          const { data: dbFiches, error: dbError } = await supabase
            .from('supplement_fiche')
            .select('slug, markdown');
          
          if (dbError) {
            console.error('❌ [useFiches] Database fallback error:', dbError);
            throw new Error('Impossible de charger les fiches depuis le storage ou la base de données');
          }
          
          console.log('✅ [useFiches] Using database fiches:', dbFiches?.length || 0, 'entries');
          
          const map: Record<string, string> = {};
          dbFiches?.forEach(fiche => {
            if (fiche.slug && fiche.markdown) {
              map[fiche.slug] = fiche.markdown;
            }
          });
          
          return map;
        }
        
        const md = await new Response(data).text();
        console.log('📄 [useFiches] File downloaded, content length:', md.length);

        // Parse le contenu en sections
        const sections = md.split(/\n(?=###\s+)/g);
        console.log('📑 [useFiches] Found sections:', sections.length);
        
        const map: Record<string, string> = {};
        
        for (const sec of sections) {
          const titleMatch = sec.match(/^###\s+(.+)$/m);
          if (!titleMatch) continue;
          
          // Titre attendu: "123. Nom du produit — Score **X**"
          const titleRaw = titleMatch[1];
          const name = titleRaw.split('—')[0].replace(/^\d+\.\s*/, '').trim();
          const slug = utilSlugify(name);
          
          if (slug) {
            map[slug] = sec.trim();
            console.log(`📝 [useFiches] Mapped "${name}" → "${slug}"`);
          }
        }
        
        console.log('✅ [useFiches] Parsed fiches map:', Object.keys(map).length, 'entries');
        return map;
        
      } catch (error) {
        console.error('❌ [useFiches] Unexpected error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useFiche(slug: string, version?: string | number) {
  const { data, isLoading, error, refetch } = useFiches(version);
  
  console.log(`🔍 [useFiche] Looking for slug: "${slug}"`);
  
  const fiche = data?.[slug] ?? null;
  
  if (fiche) {
    console.log(`✅ [useFiche] Found fiche for slug: "${slug}"`);
  } else {
    console.log(`❌ [useFiche] No fiche found for slug: "${slug}"`);
    if (data) {
      console.log('📋 [useFiche] Available slugs:', Object.keys(data).slice(0, 10));
    }
  }
  
  return { 
    fiche, 
    isLoading, 
    error, 
    refetch,
    availableSlugs: data ? Object.keys(data) : []
  };
}