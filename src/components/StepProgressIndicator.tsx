import { cn } from "@/lib/utils";

interface StepProgressIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  steps: Array<{
    number: number;
    title: string;
  }>;
}

export const StepProgressIndicator = ({ currentStep, onStepClick, steps }: StepProgressIndicatorProps) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => onStepClick(step.number)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors",
                currentStep >= step.number
                  ? "bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white"
                  : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
              )}
            >
              {step.number}
            </button>
            
            {/* Step Label */}
            <button
              onClick={() => onStepClick(step.number)}
              className={cn(
                "ml-3 text-sm font-medium cursor-pointer transition-colors",
                currentStep >= step.number
                  ? "text-[#e6d280]"
                  : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              {step.title}
            </button>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4 h-px bg-zinc-700">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    currentStep > step.number
                      ? "bg-gradient-to-r from-[#a08032] to-[#e6d280]"
                      : "bg-zinc-700"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
