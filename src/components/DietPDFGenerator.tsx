import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
  Image
} from '@react-pdf/renderer';
import headerImage from '/images/pdf-header.png?url';
import footerImage from '/images/pdf-footer.png?url';
import { getImageSize } from '@/utils/getImageSize';
import { formatIngredientQuantity } from '@/utils/formatIngredients';
import type {
  DietPDFDocumentProps,
  Ingredient,
  Meal,
  DayPlan,
  MacroPlanning,
  CalculatorResults,
  Client
} from './DietPDFTypes';

// Exported constants for useDietPDFGenerator hook
export const A4_WIDTH_PT = 595.28; // szerokość A4 w punktach (72dpi)
export const mm = (v: number) => (v * 72) / 25.4; // 1 mm = 2.8346 pt

// Helper funkcje dla layout kolumny - zgodnie z sugestią użytkownika
const SIDE_PAD_MM = 22;                     // ile „marginesu" po bokach (zmienisz wg gustu)
const CONTENT_WIDTH = A4_WIDTH_PT - 2 * mm(SIDE_PAD_MM);

// Rejestracja fontów Roboto z pełnym wsparciem polskich znaków
Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto/static/Roboto-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Roboto/static/Roboto-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/Roboto/static/Roboto-Italic.ttf", fontStyle: "italic" },
    { src: "/fonts/Roboto/static/Roboto-BoldItalic.ttf", fontWeight: "bold", fontStyle: "italic" }
  ]
});

// Dodatkowa rejestracja dla pewności - wsparcie dla polskich znaków
 // Wyłączanie automatycznego dzielenia słów lub rejestracja callbacka może być niestabilna w niektórych środowiskach.
 // Jeśli potrzebujesz specjalnej hyphenacji, odkomentuj i dostosuj poniższą linię.
 // Font.registerHyphenationCallback(word => [word]);

// Style dla PDF z fixed header i footer - full width z dynamicznymi wymiarami
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: 'Roboto',
    fontSize: 10, // zmniejszono z 12 do 10 dla kompaktowości
    lineHeight: 1.3, // zmniejszono z 1.4 do 1.3 dla kompaktowości
    // Uwaga: bez paddingLeft/Right tutaj (header/footer mają być full-bleed)
  },
  // Fixed header na każdej stronie - pełna szerokość
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',

    // height będzie ustawiana dynamicznie
  },
  title: {
    fontSize: 22, // zwiększono z 18 do 22 (1.2x)
    fontWeight: 'bold',
    color: '#a08032',
    marginBottom: 10,
    letterSpacing: 1,
  },
  date: {
    fontSize: 12, // zwiększono z 9 do 11 (1.2x)
    color: '#6b7280',
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16, // zwiększono z 12 do 14 (1.2x)
    fontWeight: 'bold',
    color: '#a08032',
    marginBottom: 10,
    paddingBottom: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    minWidth: '45%',
    textAlign: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10, // zwiększono z 8 do 10 (1.2x)
    color: '#374151',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12, // zwiększono z 10 do 12 (1.2x)
    color: '#111827',
  },
  dayContainer: {
    marginBottom: 8, // zmniejszono z 15 do 8 dla kompaktowości
  },
  dayTitle: {
    fontSize: 12, // zmniejszono z 13 do 12 dla kompaktowości
    fontWeight: 'bold',
    color: '#a08032',
    // Usunięto backgroundColor, padding i borderRadius
    marginBottom: 10,
  },
  daySummary: {
    border: '1pt solid #e5e7eb', // delikatna ramka
    padding: 6, // minimalny padding
    borderRadius: 3, // delikatne zaokrąglenie
    marginBottom: 8, // zmniejszono z 10 do 8 dla kompaktowości
  },
  summaryTitle: {
    fontSize: 9, // zmniejszono z 11 do 9 dla kompaktowości
    fontWeight: 'bold',
    marginBottom: 4, // zmniejszono z 8 do 4 dla kompaktowości
  },
  summaryGrid: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    marginRight: 10, // zmniejszono z 15 do 10 dla kompaktowości
  },
  summaryLabel: {
    fontSize: 7, // zmniejszono z 8 do 7 dla kompaktowości
    color: '#64748b',
    marginBottom: 1, // zmniejszono z 2 do 1 dla kompaktowości
  },
  summaryValue: {
    fontSize: 8, // zmniejszono z 10 do 8 dla kompaktowości
    fontWeight: 'bold',
    color: '#a08032',
  },
  mealContainer: {
    marginBottom: 6, // zmniejszono z 10 do 6 dla kompaktowości
    padding: 0,
  },
  mealHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 4, // zmniejszono z 8 do 4 dla kompaktowości
  },
  mealName: {
    fontSize: 11, // zmniejszono z 13 do 11 dla kompaktowości
    fontWeight: 'bold',
    color: '#a08032',
    marginBottom: 1, // zmniejszono z 2 do 1 dla kompaktowości
  },
  dishName: {
    fontSize: 10, // zmniejszono z 12 do 10 dla kompaktowości
    color: '#111827',
    marginBottom: 2, // zmniejszono z 4 do 2 dla kompaktowości
  },
  mealNutrition: {
    fontSize: 8, // zmniejszono z 10 do 8 dla kompaktowości
    color: '#374151',
    marginBottom: 2, // zmniejszono z 4 do 2 dla kompaktowości
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2, // zmniejszono z 4 do 2 dla kompaktowości
    border: '1pt solid #e5e7eb', // delikatna ramka
    paddingTop: 4, // górny padding
    paddingBottom: 4, // dolny padding taki sam jak górny
    borderRadius: 3, // delikatne zaokrąglenie
    backgroundColor: '#fafafa', // bardzo delikatne tło
    width: '100%', // pełna szerokość kolumny
    paddingLeft: 4, // normalny padding lewy
    paddingRight: 4, // normalny padding prawy
  },
  nutritionItem: {
    fontSize: 8, // zmniejszono z 10 do 8 dla kompaktowości
    color: '#374151',
    marginRight: 12,
    lineHeight: 1, // zredukowany lineHeight żeby nie było dodatkowej przestrzeni pod tekstem
  },
  mealCalories: {
    fontSize: 10, // zwiększono z 8 do 10 (1.2x)
    fontWeight: 'bold',
    marginBottom: 2,
  },
  ingredientsSection: {
    marginBottom: 4, // zmniejszono z 5 do 4 dla kompaktowości
  },
  ingredientsTitle: {
    fontSize: 9, // zmniejszono z 11 do 9 dla kompaktowości
    fontWeight: 'bold',
    marginBottom: 2, // zmniejszono z 4 do 2 dla kompaktowości
  },
  ingredient: {
    flexDirection: 'row',
    fontSize: 9, // zmniejszono z 11 do 9 dla kompaktowości
    marginBottom: 1, // zmniejszono z 2 do 1 dla kompaktowości
    color: '#374151',
  },
  ingredientName: {
    flex: 1,
    marginRight: 8,
    fontSize: 9, // zmniejszono z 11 do 9 dla kompaktowości
    color: '#374151',
  },
  ingredientQuantity: {
    minWidth: 60,
    textAlign: 'right',
    fontSize: 9, // zmniejszono z 11 do 9 dla kompaktowości
    color: '#374151',
  },
  instructionsSection: {
    marginBottom: 5, // zmniejszono z 8 do 5 dla kompaktowości
  },
  instructionsTitle: {
    fontSize: 10, // zmniejszono z 12 do 10 dla kompaktowości
    fontWeight: 'bold',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 9, // zmniejszono z 12 do 9 dla kompaktowości
    color: '#374151',
    marginBottom: 2,
    paddingLeft: 6, // zmniejszono z 8 do 6 dla kompaktowości
  },
  notCountedNote: {
    fontSize: 7, // zwiększono z 6 do 7 (1.1x dla małych)
    color: '#9ca3af',
    fontWeight: 'normal',
    marginTop: 5,
  },
  textContent: {
    fontSize: 9, // zmniejszono z 12 do 9 dla kompaktowości
    color: '#374151',
    lineHeight: 1.3, // zmniejszono z 1.4 do 1.3 dla kompaktowości
  },
  // Fixed footer na każdej stronie - pełna szerokość
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    // height będzie ustawiana dynamicznie
  },
  // Style dla głównej treści
  mainContent: {
    flex: 1,
    paddingTop: 10,
    // bez paddingLeft/Right
  },
  // NOWE: kolumna o stałej szerokości, wycentrowana
  contentColumn: {
    width: CONTENT_WIDTH,   // stała szerokość kolumny
    alignSelf: 'center',    // wyśrodkuj
  },
});

// Styl używany do unikania łamania strony; przypisany oddzielnie, bo TS czasem nie
// akceptuje pageBreakInside wewnątrz inline style. Rzutujemy na any przy użyciu const.
const NO_BREAK_STYLE: any = { pageBreakInside: 'avoid' };

export const GAP = 8; // mały odstęp, żeby content nie "przyklejał się" do pasków

// Komponent dokumentu PDF - exported for lazy loading
export const DietPDFDocument: React.FC<DietPDFDocumentProps> = ({
  client,
  dayPlans,
  dayCalories,
  dayMacros,
  calculatorResults,
  importantNotes,
  showMacros = true,
  selectedDayIds,
  headerHeightPt,
  footerHeightPt,
  headerUrl,
  footerUrl
}) => {
  const calculateAge = (birthDate?: string): number => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatText = (text: string) => {
    // @react-pdf/renderer automatycznie obsługuje polskie znaki!
    return text;
  };

  // Bezpieczne domyślne wartości dla dayCalories i dayMacros
  const dayCaloriesSafe = dayCalories || {};
  const dayMacrosSafe = dayMacros || {};

  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingTop: headerHeightPt + GAP, paddingBottom: footerHeightPt + GAP }]}>
        {/* Fixed Header - pojawi się na każdej stronie - pełna szerokość z auto-height */}
        <View style={[styles.fixedHeader, { height: headerHeightPt }]} fixed>
          <Image
            src={headerUrl}
            style={{
              width: '100%',
              // Brak sztywnej wysokości - auto-scaling na podstawie aspect ratio
            }}
          />
          {/* Numeracja stron - na headerze, prawy górny róg */}
          <Text
            style={{
              position: 'absolute',
              top: 10, // 10pt od góry headera
              right: mm(SIDE_PAD_MM), // margines z prawej strony
              fontSize: 10,
              fontWeight: 'bold',
              color: '#1f2937',
              fontFamily: 'Roboto'
            }}
            render={({ pageNumber }) => `${pageNumber}`}
            fixed
          />
        </View>

        {/* Fixed Footer - pojawi się na każdej stronie - pełna szerokość z auto-height */}
        <View style={[styles.fixedFooter, { height: footerHeightPt }]} fixed>
          <Image
            src={footerUrl}
            style={{
              width: '100%',
              // Brak sztywnej wysokości - auto-scaling na podstawie aspect ratio
            }}
          />
        </View>

        {/* Główna treść dokumentu z dynamicznym paddingiem */}
        <View style={styles.mainContent}>
          {/* CAŁA dotychczasowa treść idzie do środka tej kolumny */}
          <View style={styles.contentColumn}>

           
            {/* Diet Plan - NOWY UKŁAD */}
            <View style={styles.section}>
              
              {dayPlans
                .filter((day) => !selectedDayIds || selectedDayIds.includes(day.id)) // Filtruj według wybranych dni
                .filter((day) => day.meals && day.meals.length > 0) // Filtruj tylko dni z posiłkami
                .map((day, dayIndex) => {
                  const actualTotals = {
                    calories: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.calories : 0), 0),
                    protein: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.protein : 0), 0),
                    fat: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.fat : 0), 0),
                    carbs: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.carbs : 0), 0),
                    fiber: day.meals.reduce((sum, meal) => sum + (meal.countTowardsDailyCalories ? meal.fiber : 0), 0)
                  };

                  const sortedMeals = [...day.meals].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                  
                  // Zbieranie instrukcji z posiłków z labelkami
                  const mealInstructions = sortedMeals
                    .map(meal => ({
                      mealName: meal.name,
                      dishName: meal.dish,
                      instructions: (meal.instructions || []).filter(instruction => instruction && instruction.trim())
                    }))
                    .filter(mealData => mealData.instructions.length > 0);

                  return (
                  <View key={day.id} style={styles.dayContainer} break={dayIndex > 0} minPresenceAhead={150}>
                    {/* 1. WYŚRODKOWANY TYTUŁ DNIA BEZ TŁA */}
                    <Text style={[styles.dayTitle, { textAlign: 'center' }]}>
                      {formatText(day.name.toUpperCase())}
                    </Text>

                    {/* Day Summary - tylko gdy showMacros jest włączone */}
                    {showMacros && sortedMeals.length > 0 && (
                      <View style={styles.daySummary}>
                        <Text style={styles.summaryTitle}>
                          {formatText('Podsumowanie dnia:')}
                        </Text>
                        <View style={styles.summaryGrid}>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Kalorie:</Text>
                            <Text style={styles.summaryValue}>
                              {Math.round(actualTotals.calories)} kcal
                            </Text>
                          </View>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Białko:</Text>
                            <Text style={styles.summaryValue}>
                              {Math.round(actualTotals.protein)}g
                            </Text>
                          </View>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tłuszcze:</Text>
                            <Text style={styles.summaryValue}>
                              {Math.round(actualTotals.fat)}g
                            </Text>
                          </View>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Węglowodany:</Text>
                            <Text style={styles.summaryValue}>
                              {Math.round(actualTotals.carbs)}g
                            </Text>
                          </View>
                          <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Błonnik:</Text>
                            <Text style={styles.summaryValue}>
                              {Math.round(actualTotals.fiber)}g
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 2. POSIŁKI BEZ INSTRUKCJI */}
                    {sortedMeals.map((meal, idx) => (
                      <View key={meal.id} style={ idx === 0 && !showMacros ? NO_BREAK_STYLE : undefined }>
                        <View style={styles.mealContainer}>
                          <View style={styles.mealHeader}>
                            <Text style={styles.mealName}>{formatText(meal.name)}</Text>
                            <Text style={styles.dishName}>{formatText(meal.dish)}</Text>

                            {showMacros && (
                              <View style={styles.mealNutrition}>
                                <Text style={styles.nutritionItem}>{Math.round(meal.calories)} kcal</Text>
                                <Text style={styles.nutritionItem}>Białko: {Math.round(meal.protein)}g</Text>
                                <Text style={styles.nutritionItem}>Tłuszcze: {Math.round(meal.fat)}g</Text>
                                <Text style={styles.nutritionItem}>Węglowodany: {Math.round(meal.carbs)}g</Text>
                                {meal.fiber > 0 && (
                                  <Text style={styles.nutritionItem}>Błonnik: {Math.round(meal.fiber)}g</Text>
                                )}
                              </View>
                            )}
                          </View>

                          {/* Dodatkowy odstęp gdy makro są ukryte */}
                          {!showMacros && (
                            <View style={{ marginBottom: 4 }} />
                          )}

                          {/* Ingredients */}
                          {meal.ingredients && meal.ingredients.length > 0 && (
                            <View style={styles.ingredientsSection}>
                              <Text style={styles.ingredientsTitle}>
                                {formatText('Składniki:')}
                              </Text>
                              {meal.ingredients.map((ingredient, idx) => (
                                <View key={ingredient.id ?? idx} style={styles.ingredient}>
                                  <Text style={styles.ingredientName}>{formatText(ingredient.name)}</Text>
                                  <Text style={styles.ingredientQuantity}>{formatIngredientQuantity(ingredient.quantity, ingredient.unit)}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Instructions usunięte z posiłków - są teraz tylko na końcu dnia */}

                          {!meal.countTowardsDailyCalories && (
                            <Text style={styles.notCountedNote}>
                              {formatText('* Nie wlicza się do dziennego bilansu kalorii')}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {/* 3. WAŻNE INFORMACJE DLA TEGO DNIA */}
                    {importantNotes && importantNotes.trim() && (
                      <View style={[styles.section, { marginTop: 10 }]}>
                        <Text style={styles.sectionTitle}>
                          {formatText('Ważne informacje')}
                        </Text>
                        <View>
                          <Text style={styles.textContent}>
                            {formatText(importantNotes.trim())}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* 4. INSTRUKCJE DO POSIŁKÓW NA KOŃCU DNIA Z LABELKAMI */}
                    {mealInstructions.length > 0 && (
                      <View style={[styles.section, { marginTop: 10 }]}>
                        <Text style={styles.sectionTitle}>
                          {formatText('Instrukcje do posiłków')}
                        </Text>
                        <View >
                          {mealInstructions.map((mealData, mealIdx) => {
                            const hasMultipleInstructions = mealData.instructions.length > 1;
                            
                            return [
                              // Separator przed kolejnymi posiłkami (oprócz pierwszego)
                              mealIdx > 0 && (
                                <View key={`${mealIdx}-separator`} style={{
                                  borderTop: '1.5pt solid #d1d5db',
                                  marginTop: 10,
                                  marginBottom: 10,
                                  marginLeft: -6,
                                  marginRight: -6
                                }} />
                              ),
                              // Labelka z nazwą posiłku i dania
                              <Text key={`${mealIdx}-meal-label`} style={[styles.instruction, {
                                fontWeight: 'bold',
                                marginTop: 0,
                                marginBottom: 4,
                                fontSize: 10, // powiększono z 9 do 10
                                textDecoration: 'underline', // podkreślenie
                                color: '#a08032' // złoty kolor dla wyróżnienia
                              }]}>
                                {formatText(`${mealData.mealName} - ${mealData.dishName}:`)}
                              </Text>,
                              
                              // Instrukcje dla tego posiłku
                              ...mealData.instructions.map((instruction, instructionIdx) => {
                                const lines = instruction.split('\\n').filter(line => line.trim());
                                
                                if (hasMultipleInstructions) {
                                  return [
                                    <Text key={`${mealIdx}-${instructionIdx}-label`} style={[styles.instruction, { fontWeight: 'bold', marginTop: instructionIdx > 0 ? 8 : 0, paddingLeft: 12 }]}>
                                      {formatText(`Instrukcja ${instructionIdx + 1}:`)}
                                    </Text>,
                                    ...lines.map((line, lineIdx) => (
                                      <Text key={`${mealIdx}-${instructionIdx}-${lineIdx}`} style={[styles.instruction, { paddingLeft: 12 }]}>
                                        {formatText(line)}
                                      </Text>
                                    ))
                                  ];
                                } else {
                                  return lines.map((line, lineIdx) => (
                                    <Text key={`${mealIdx}-${instructionIdx}-${lineIdx}`} style={[styles.instruction, { paddingLeft: 12 }]}>
                                      {formatText(line)}
                                    </Text>
                                  ));
                                }
                              })
                            ].flat();
                          }).flat()}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
};

// Export pomocniczych zasobów dla lazy loading hook
export { headerImage, footerImage };

// Default export dla backward compatibility
export default DietPDFDocument;
