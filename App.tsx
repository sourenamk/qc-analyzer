

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LoadingSpinner } from './components/LoadingSpinner';
import { AlertMessage } from './components/AlertMessage';
import { CategoryTabs } from './components/CategoryTabs';
import { TestSelector } from './components/TestSelector';
import { DataGraph } from './components/DataGraph';
import { WestgardResultsDisplay } from './components/WestgardResultsDisplay';
import { getQCInterpretationForCumulativeRun } from './services/geminiService';
import {
  TestData, TestCategoryData, AppData, AnalysisResult, MonthlyAnalysis,
  BiochemistryTestNames, HematologyTestNames, MONTH_NAMES, GeminiSingleRunPromptData, CumulativeDataPoint
} from './components/types';
import { GEMINI_MODEL_NAME } from './constants';
import { calculateStatsForSeries } from './services/qcCalculator';
import { evaluateWestgardRules } from './services/westgardRulesService';
import { loadAppData, saveAppData } from './services/localStorageService';
import { calculateSigmaMetric, getSigmaAssessment } from './services/sigmaMetricsService';
import { ReferenceDataDisplay } from './components/ReferenceDataDisplay';
import { ComplianceDisplay } from './components/ComplianceDisplay';
import { SigmaMetricsDisplay } from './components/SigmaMetricsDisplay';
import { MonthlyDataGrid } from './components/MonthlyDataGrid';
import { CumulativeStatsDisplay } from './components/CumulativeStatsDisplay';
import { exportToPdf, exportToExcel } from './services/pdfReportService';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string>(BiochemistryTestNames.categoryName);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const [dayInputs, setDayInputs] = useState<string[]>([]);
  
  const [cumulativeAnalysisResult, setCumulativeAnalysisResult] = useState<AnalysisResult | null>(null);
  const [cumulativeChartData, setCumulativeChartData] = useState<CumulativeDataPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const createInitialTestData = (testInfo: {id: string, name: string}): TestData => ({
    id: testInfo.id,
    name: testInfo.name,
    targetMeanStr: '',
    refBioCVStr: '',
    refBioBiasStr: '',
    refBioTEaStr: '',
    cliaTEaStr: '',
    sigmaWarningThresholdStr: '4', 
    sigmaCriticalThresholdStr: '3', 
    targetCvPercentStr: '',
    monthlyAnalyses: {},
  });

  useEffect(() => {
    const loadedData = loadAppData();
    if (loadedData) {
        const migratedCategories = loadedData.categories.map(cat => ({
            ...cat,
            tests: cat.tests.map(t => {
                const { analysisHistory, ...restOfT } = t as any; // Remove old field
                const initialT = createInitialTestData(t);
                const newTest = { ...initialT, ...restOfT };
                if (!newTest.monthlyAnalyses) { // Ensure new field exists
                    newTest.monthlyAnalyses = {};
                }
                return newTest;
            }),
        }));
        const migratedAppData = { ...loadedData, categories: migratedCategories };
        setAppData(migratedAppData);
        if (migratedAppData.categories.length > 0) {
            const firstCategory = migratedAppData.categories[0];
            setActiveCategoryName(firstCategory.name);
            if (firstCategory.tests.length > 0) {
                setActiveTestId(firstCategory.tests[0].id);
            }
        }
    } else {
      const initialCategories: TestCategoryData[] = [
        { name: BiochemistryTestNames.categoryName, tests: BiochemistryTestNames.tests.map(createInitialTestData) },
        { name: HematologyTestNames.categoryName, tests: HematologyTestNames.tests.map(createInitialTestData) },
      ];
      const initialAppData: AppData = { year: new Date().getFullYear(), categories: initialCategories };
      setAppData(initialAppData);
      setActiveCategoryName(initialCategories[0].name);
      setActiveTestId(initialCategories[0].tests.length > 0 ? initialCategories[0].tests[0].id : null);
    }
    setIsLoading(false);
  }, []);

  const activeCategory = useMemo(() => appData?.categories.find(cat => cat.name === activeCategoryName), [appData, activeCategoryName]);
  const activeTest = useMemo(() => activeCategory?.tests.find(t => t.id === activeTestId), [activeCategory, activeTestId]);

  const aggregateAllDataForTest = useCallback((test: TestData, currentMonth: number, currentYear: number): CumulativeDataPoint[] => {
    const allPoints: CumulativeDataPoint[] = [];
    if (!test.monthlyAnalyses) return [];

    const sortedYearMonthKeys = Object.keys(test.monthlyAnalyses).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return monthA - monthB;
    });

    for (const yearMonthKey of sortedYearMonthKeys) {
        const [year, month] = yearMonthKey.split('-').map(Number);
        const monthlyData = test.monthlyAnalyses[yearMonthKey];
        
        monthlyData.values.forEach((valueStr, dayIndex) => {
            const value = parseFloat(valueStr);
            if (!isNaN(value)) {
                allPoints.push({
                    date: new Date(year, month, dayIndex + 1),
                    value: value,
                    isCurrentMonth: year === currentYear && month === currentMonth
                });
            }
        });
    }
    return allPoints;
  }, []);

  useEffect(() => {
    if (!activeTest) return;

    // Load grid data for the selected month
    const yearMonthKey = `${selectedYear}-${selectedMonth}`;
    const savedMonthData = activeTest.monthlyAnalyses?.[yearMonthKey];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    setDayInputs(savedMonthData ? savedMonthData.values.slice(0, daysInMonth) : Array(daysInMonth).fill(''));

    // Update chart with all historical data, highlighting the current month
    const aggregatedData = aggregateAllDataForTest(activeTest, selectedMonth, selectedYear);
    setCumulativeChartData(aggregatedData);

    // Clear previous analysis results when changing view, to avoid showing stale data
    // The user must click "Update & Analyze" to get a new result.
    setCumulativeAnalysisResult(null);

  }, [activeTest, selectedMonth, selectedYear, aggregateAllDataForTest]);


  const handleTestParamsChange = useCallback((testId: string, updatedData: Partial<TestData>) => {
    setAppData(prevData => {
      if (!prevData) return null;
      const newCategories = prevData.categories.map(category => {
        if (category.name === activeCategoryName) {
          return { ...category, tests: category.tests.map(test => test.id === testId ? { ...test, ...updatedData } : test) };
        }
        return category;
      });
      return { ...prevData, categories: newCategories };
    });
  }, [activeCategoryName]);

  const handleSaveParameters = () => {
    if (appData) {
      saveAppData(appData);
      setSuccessMessage("Test parameters saved successfully!");
      setTimeout(() => setSuccessMessage(null), 2500);
    }
  };
  
  const handleDayInputChange = (dayIndex: number, value: string) => {
    const newDayInputs = [...dayInputs];
    newDayInputs[dayIndex] = value;
    setDayInputs(newDayInputs);
  };
  
  const handleUpdateAndAnalyze = async () => {
    if (!activeTest || isAnalyzing || !appData) return;
    setIsAnalyzing(true);
    setCumulativeAnalysisResult(null);
    setErrorMessage(null);
    await new Promise(resolve => setTimeout(resolve, 0));

    const targetMean = parseFloat(activeTest.targetMeanStr);
    if (isNaN(targetMean)) {
      setErrorMessage('Target Mean must be a valid number for analysis.');
      setIsAnalyzing(false);
      return;
    }
    
    // Step 1: Persist the current grid's data into the main appData state
    const yearMonthKey = `${selectedYear}-${selectedMonth}`;
    const newMonthlyAnalysisForGrid: MonthlyAnalysis = {
      values: dayInputs,
      result: null // This specific month's result is not stored, only cumulative is calculated
    };
    
    let updatedTest: TestData | undefined;
    const newAppData = {
      ...appData,
      categories: appData.categories.map(category => {
        if (category.name === activeCategoryName) {
          const newTests = category.tests.map(test => {
            if (test.id === activeTestId) {
              const newMonthlyAnalyses = { ...test.monthlyAnalyses, [yearMonthKey]: newMonthlyAnalysisForGrid };
              updatedTest = { ...test, monthlyAnalyses: newMonthlyAnalyses };
              return updatedTest;
            }
            return test;
          });
          return { ...category, tests: newTests };
        }
        return category;
      })
    };
    setAppData(newAppData);
    saveAppData(newAppData);

    if (!updatedTest) {
      setErrorMessage("Could not find the test to update.");
      setIsAnalyzing(false);
      return;
    }

    // Step 2: Aggregate ALL data for the cumulative analysis
    const cumulativeData = aggregateAllDataForTest(updatedTest, selectedMonth, selectedYear);
    setCumulativeChartData(cumulativeData);
    
    if (cumulativeData.length === 0) {
      setErrorMessage("No numeric data found across all months to analyze.");
      setIsAnalyzing(false);
      return;
    }

    const dataValues = cumulativeData.map(d => d.value);
    const rawDataString = dataValues.join('\n');
    
    // Step 3: Run cumulative analysis
    const stats = calculateStatsForSeries(dataValues, targetMean);
    const violations = evaluateWestgardRules(dataValues, stats.observedMean, stats.observedSD);

    let sigmaMetrics: AnalysisResult['sigmaMetric'] = null;
    const teaStrToUse = activeTest.cliaTEaStr || activeTest.refBioTEaStr;
    if (stats.observedCV !== null && stats.biasPercent !== null && teaStrToUse) {
        const tea = parseFloat(teaStrToUse);
        if (!isNaN(tea)) {
            const sigmaValue = calculateSigmaMetric(tea, stats.biasPercent, stats.observedCV);
            sigmaMetrics = {
                sigmaValue,
                assessment: getSigmaAssessment(sigmaValue),
                details: `Calculated using TEa=${tea}%, Bias=${stats.biasPercent.toFixed(2)}%, CV=${stats.observedCV.toFixed(2)}%`
            };
        }
    }

    const geminiData: GeminiSingleRunPromptData = {
        testName: activeTest.name,
        targetMean: targetMean,
        rawData: rawDataString,
        westgardViolations: violations,
        observedMean: stats.observedMean,
        observedSD: stats.observedSD,
        observedCV: stats.observedCV,
        biasPercent: stats.biasPercent,
        sigmaMetric: sigmaMetrics,
        refBioTEa: activeTest.refBioTEaStr || null,
        cliaTEa: activeTest.cliaTEaStr || null,
        sigmaWarningThreshold: parseFloat(activeTest.sigmaWarningThresholdStr) || null,
        sigmaCriticalThreshold: parseFloat(activeTest.sigmaCriticalThresholdStr) || null,
    };
    
    let interpretation = 'Analysis complete. AI interpretation was not requested or failed.';
    try {
        interpretation = await getQCInterpretationForCumulativeRun(geminiData);
    } catch (e: any) {
        console.error("Gemini interpretation failed:", e);
        interpretation = `AI interpretation failed: ${e.message}`;
        setErrorMessage(`AI interpretation failed: ${e.message}`);
    }

    const analysisResult: AnalysisResult = {
        timestamp: new Date().toISOString(),
        rawData: rawDataString,
        calculatedStats: stats,
        westgardViolations: violations,
        sigmaMetric: sigmaMetrics,
        geminiInterpretation: interpretation
    };

    setCumulativeAnalysisResult(analysisResult);
    setIsAnalyzing(false);
    setSuccessMessage("Data updated and cumulative analysis complete!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
 const handleExportPdf = async () => {
    if (!cumulativeAnalysisResult || !activeTest || isExporting) return;
    setIsExporting(true);
    setSuccessMessage("Generating PDF report...");
    setErrorMessage(null);
    try {
      await exportToPdf('analysis-section-content', activeTest.name);
      setSuccessMessage("PDF report generated successfully!");
    } catch (error: any) {
      setErrorMessage(`Failed to generate PDF: ${error.message}`);
      setSuccessMessage(null);
    } finally {
      setIsExporting(false);
      setTimeout(() => {
          setSuccessMessage(null);
          setErrorMessage(null);
      }, 4000);
    }
  };

  const handleExportExcel = async () => {
    if (!cumulativeAnalysisResult || !activeTest || !cumulativeChartData || isExporting) return;
    setIsExporting(true);
    setSuccessMessage("Generating Excel report...");
    setErrorMessage(null);
    try {
      await exportToExcel(
          'cumulative-chart',
          activeTest,
          cumulativeChartData,
          cumulativeAnalysisResult.calculatedStats
      );
      setSuccessMessage("Excel report generated successfully!");
    } catch (error: any) {
      setErrorMessage(`Failed to generate Excel: ${error.message}`);
      setSuccessMessage(null);
    } finally {
      setIsExporting(false);
      setTimeout(() => {
          setSuccessMessage(null);
          setErrorMessage(null);
      }, 4000);
    }
  };


  const renderAnalysisSection = () => {
    if (isAnalyzing) {
      return <LoadingSpinner message="Performing cumulative analysis..." />;
    }
    if (!cumulativeAnalysisResult) {
      return <p className="text-center text-gray-500 italic mt-8">Enter data and click 'Update &amp; Analyze' to view cumulative results.</p>;
    }
    
    const { calculatedStats, westgardViolations, sigmaMetric, geminiInterpretation } = cumulativeAnalysisResult;
    const canExport = !!cumulativeAnalysisResult && !isExporting;
    
    return (
      <div className="mt-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100">Cumulative Analysis Report</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportPdf}
                        disabled={!canExport}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
                    >
                        {isExporting ? 'Exporting...' : 'Export to PDF'}
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={!canExport}
                        className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
                    >
                        {isExporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                </div>
            </div>

            <div id="analysis-section-content" className="space-y-8 p-4 bg-gray-900">
                <CumulativeStatsDisplay stats={calculatedStats} />

                <DataGraph 
                    id="cumulative-chart"
                    data={cumulativeChartData}
                    title={`${activeTest?.name} QC Chart - Cumulative View`}
                    targetMean={activeTest ? parseFloat(activeTest.targetMeanStr) : null}
                    observedMean={calculatedStats.observedMean}
                    observedSD={calculatedStats.observedSD}
                    westgardViolations={westgardViolations}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                        <WestgardResultsDisplay violations={westgardViolations} />
                    </div>
                    <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                        <SigmaMetricsDisplay 
                            sigmaMetrics={sigmaMetric} 
                            warningThreshold={activeTest ? parseFloat(activeTest.sigmaWarningThresholdStr) : null}
                            criticalThreshold={activeTest ? parseFloat(activeTest.sigmaCriticalThresholdStr) : null}
                        />
                    </div>
                </div>

                <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                    <ReferenceDataDisplay testData={activeTest || null} />
                </div>

                <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                    <ComplianceDisplay calculatedStats={calculatedStats} testData={activeTest || null} />
                </div>
                
                <div className="mt-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-200 mb-3">Gemini AI Interpretation (Cumulative)</h3>
                    <div className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 bg-gray-900 rounded-md">
                        {geminiInterpretation || "No AI interpretation available."}
                    </div>
                </div>
                
            </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 tracking-tight">
            Comprehensive Lab QC Analyzer
          </h1>
          <p className="mt-2 text-lg text-gray-400">Cumulative Quality Control Data Analysis with AI Insights</p>
        </header>

        {isLoading ? (
          <LoadingSpinner message="Loading application data..." />
        ) : !appData ? (
          <AlertMessage type="error" message="Could not load application data. Please refresh the page." />
        ) : (
          <>
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
              <CategoryTabs 
                categories={appData.categories.map(c => c.name)} 
                activeCategory={activeCategoryName} 
                onSelectCategory={(name) => {
                  setActiveCategoryName(name);
                  const newCategory = appData.categories.find(c => c.name === name);
                  setActiveTestId(newCategory?.tests[0]?.id || null);
                }}
              />
              {activeCategory && (
                <TestSelector 
                  tests={activeCategory.tests} 
                  activeTestId={activeTestId} 
                  onSelectTest={setActiveTestId}
                />
              )}
            </div>

            {successMessage && <div className="my-4"><AlertMessage type="success" message={successMessage} onClose={() => setSuccessMessage(null)} /></div>}
            {errorMessage && <div className="my-4"><AlertMessage type="error" message={errorMessage} onClose={() => setErrorMessage(null)} /></div>}

            {activeTest ? (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Input Parameters & Data Entry */}
                <div className="lg:col-span-1 space-y-8">
                  <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                      <h2 className="text-2xl font-bold text-gray-100 mb-4 border-b border-gray-600 pb-2">Test Parameters</h2>
                      <div className="space-y-4">
                        {(['targetMeanStr', 'refBioCVStr', 'refBioBiasStr', 'refBioTEaStr', 'cliaTEaStr', 'sigmaWarningThresholdStr', 'sigmaCriticalThresholdStr'] as const).map(key => (
                          <div key={key}>
                            <label htmlFor={key} className="block text-sm font-medium text-gray-300">
                                {key.replace('Str', '').replace(/([A-Z])/g, ' $1').replace('ref Bio', 'Ref. Bio.').trim()}:
                            </label>
                            <input
                                id={key}
                                type="text"
                                value={activeTest[key]}
                                onChange={(e) => handleTestParamsChange(activeTest.id, { [key]: e.target.value })}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder={key.includes('Threshold') ? 'e.g., 3' : 'e.g., 100.5'}
                            />
                          </div>
                        ))}
                      </div>
                      <button onClick={handleSaveParameters} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Save Parameters
                      </button>
                  </div>

                   <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-100 mb-4 border-b border-gray-600 pb-2">Monthly Data Entry</h2>
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <label htmlFor="month-select" className="block text-sm font-medium text-gray-300">Month</label>
                                <select id="month-select" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label htmlFor="year-select" className="block text-sm font-medium text-gray-300">Year</label>
                                <select id="year-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                        </div>

                        <MonthlyDataGrid 
                           dayInputs={dayInputs} 
                           onDayInputChange={handleDayInputChange} 
                           selectedMonth={selectedMonth}
                           selectedYear={selectedYear}
                        />

                        <button
                          onClick={handleUpdateAndAnalyze}
                          disabled={isAnalyzing}
                          className="mt-6 w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:bg-indigo-400 disabled:cursor-not-allowed"
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Update & Analyze'}
                        </button>
                    </div>

                </div>

                {/* Right Column: Analysis Results */}
                <div className="lg:col-span-2">
                    {renderAnalysisSection()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Please select a test category and a test to begin.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;