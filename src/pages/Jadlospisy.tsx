import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { fetchTemplatesFromSupabase, findOrCreateTemplateAndDayPlan } from "@/utils/supabaseTemplates";
import TemplateFilters from "@/components/TemplateFilters";
import TemplateTableHeader from "@/components/TemplateTableHeader";
import TemplateTableRow from "@/components/TemplateTableRow";
import EmptyTemplatesState from "@/components/EmptyTemplatesState";
import { logger } from '@/utils/logger';

const Jadlospisy = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "calories" | "protein" | "carbs" | "fat">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: loading } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplatesFromSupabase,
  });

  useEffect(() => {
    const channel = supabase
      .channel('public:templates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, payload => {
        queryClient.invalidateQueries({ queryKey: ['templates'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Brak wyliczania makroskładników – uproszczona lista szablonów

    // Przekazuj pełne dane bez mapowania nutrition
  const templatesWithNutrition = useMemo(() => templates, [templates]);

  const filteredAndSortedTemplates = useMemo(() => {
    const filtered = templatesWithNutrition.filter(template =>
      template.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "calories":
          aValue = a.avgCalories ?? 0;
          bValue = b.avgCalories ?? 0;
          break;
        case "protein":
          aValue = a.avgProtein ?? 0;
          bValue = b.avgProtein ?? 0;
          break;
        case "carbs":
          aValue = a.avgCarbs ?? 0;
          bValue = b.avgCarbs ?? 0;
          break;
        case "fat":
          aValue = a.avgFat ?? 0;
          bValue = b.avgFat ?? 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [templatesWithNutrition, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleRowClick = (templateId: string) => {
    navigate(`/jadlospisy/${templateId}`);
  };

  const handleCreateTemplate = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        alert("Brak zalogowanego użytkownika!");
        return;
      }
      const { templateId } = await findOrCreateTemplateAndDayPlan(userId);
      if (templateId) {
        navigate(`/jadlospisy/${templateId}`);
      } else {
        alert("Nie udało się utworzyć szablonu.");
      }
    } catch (error) {
      logger.error("❌ Błąd tworzenia szablonu:", error);
      alert("Wystąpił błąd podczas tworzenia szablonu.");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Jadłospisy</h1>
          <p className="text-zinc-400 mt-1">Zarządzaj szablonami jadłospisów</p>
        </div>
        <Button
          onClick={handleCreateTemplate}
          className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-white font-medium w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Stwórz nowy szablon diety</span>
          <span className="sm:hidden">Nowy szablon</span>
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <FileText className="h-5 w-5" />
              Szablony jadłospisów
            </CardTitle>
            <TemplateFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-zinc-400 py-8 text-center">Ładowanie szablonów...</div>
          ) : filteredAndSortedTemplates.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TemplateTableHeader
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableBody>
                    {filteredAndSortedTemplates.map((template) => (
                      <TemplateTableRow
                        key={template.id}
                        template={template}
                        onClick={handleRowClick}
                        formatDate={formatDate}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredAndSortedTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
                    onClick={() => handleRowClick(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-zinc-100 text-left">{template.title}</h3>
                          </div>
                          <Badge variant="secondary" className="bg-[#a08032] text-white self-start">
                            {Math.round(template.avgCalories)} kcal
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="text-left">
                            <p className="text-sm font-medium text-zinc-300 mb-1">Makroskładniki (śr./dzień)</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                                B: {template.avgProtein.toFixed(1)}g
                              </Badge>
                              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                                W: {template.avgCarbs.toFixed(1)}g
                              </Badge>
                              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                                T: {template.avgFat.toFixed(1)}g
                              </Badge>
                              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                                Bł: {template.avgFiber.toFixed(1)}g
                              </Badge>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <div className="text-left">
                              <span className="text-zinc-400">Dni: </span>
                              <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                                {template.daysCount} dni
                              </Badge>
                            </div>
                            <div className="text-zinc-400">
                              {template.created_at ? formatDate(template.created_at) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <EmptyTemplatesState searchTerm={searchTerm} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Jadlospisy;
