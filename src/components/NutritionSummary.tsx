interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionSummaryProps {
  nutrition: NutritionData;
}

const NutritionSummary = ({ nutrition }: NutritionSummaryProps) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#a08032] mb-4">Podsumowanie dnia:</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Kalorie:</span>
            <span className="text-xl font-bold text-zinc-100">{Math.round(nutrition.calories)} kcal</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Białko:</span>
            <span className="text-xl font-bold text-zinc-100">{Math.round(nutrition.protein)}g</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Tłuszcze:</span>
            <span className="text-xl font-bold text-zinc-100">{Math.round(nutrition.fat)}g</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Węglowodany:</span>
            <span className="text-xl font-bold text-zinc-100">{Math.round(nutrition.carbs)}g</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Błonnik:</span>
          <span className="text-lg font-semibold text-zinc-100">{Math.round(nutrition.fiber * 10) / 10}g</span>
        </div>
      </div>
    </div>
  );
};

export default NutritionSummary;
