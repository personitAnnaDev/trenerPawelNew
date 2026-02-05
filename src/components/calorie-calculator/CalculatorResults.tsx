interface CalculatorResults {
  bmr: number;
  tdee: number;
}

interface CalculatorResultsProps {
  result: CalculatorResults;
}

export const CalculatorResults = ({ result }: CalculatorResultsProps) => {
  return (
    <div className="mt-4 p-4 bg-zinc-800 rounded-lg space-y-3 border border-zinc-700">
      <h3 className="font-semibold text-lg text-zinc-100 mb-3">Wyniki Obliczeń:</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
          <h4 className="font-medium text-zinc-100 text-sm mb-1">PPM</h4>
          <p className="text-xs text-zinc-300 mb-2">Podstawowa Przemiana Materii</p>
          <p className="text-2xl font-bold text-[#e6d280]">{result.bmr} kcal/dzień</p>
        </div>
        
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-700">
          <h4 className="font-medium text-zinc-100 text-sm mb-1">CPM</h4>
          <p className="text-xs text-zinc-300 mb-2">Całkowita Przemiana Materii</p>
          <p className="text-2xl font-bold text-[#e6d280]">{result.tdee} kcal/dzień</p>
        </div>
      </div>

      <p className="text-sm text-zinc-300 mt-3 text-center">
        Obliczenia wg wzoru Harrisa-Benedicta z uwzględnieniem poziomu aktywności
      </p>
    </div>
  );
};
