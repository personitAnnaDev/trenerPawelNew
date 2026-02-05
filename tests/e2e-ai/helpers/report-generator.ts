/**
 * Markdown Report Generator for E2E AI Tests
 *
 * Generates comprehensive test reports in Markdown format
 * with results, metrics, and insights
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { ValidationResult } from './ai-assertions'

export interface TestResult {
  testName: string
  scenario: string
  mealName: string
  targets: { protein: number; fat: number; carbs: number }
  initialIngredients?: Array<{
    name: string
    quantity: number
    unit: string
    protein: number
    fat: number
    carbs: number
  }>
  validation: ValidationResult
  passed: boolean
  aiComment?: string
  timestamp: Date
}

export interface TestSuite {
  suiteName: string
  aiModel: string
  results: TestResult[]
  startTime: Date
  endTime: Date
}

export class ReportGenerator {
  private testSuites: TestSuite[] = []

  /**
   * Add a test suite to the report
   */
  addTestSuite(suite: TestSuite) {
    this.testSuites.push(suite)
  }

  /**
   * Generate comprehensive Markdown report
   */
  generateMarkdownReport(): string {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.results.length, 0)
    const passedTests = this.testSuites.reduce(
      (sum, suite) => sum + suite.results.filter(r => r.passed).length,
      0
    )
    const failedTests = totalTests - passedTests

    const totalDuration = this.calculateTotalDuration()
    const totalCost = this.calculateTotalCost()
    const avgResponseTime = this.calculateAvgResponseTime()
    const avgMacroAchievement = this.calculateAvgMacroAchievement()

    let report = `# 🧪 GPT-5 AI Optimization Test Report\n\n`
    report += `**Date**: ${new Date().toLocaleString('pl-PL')}\n`
    report += `**Model**: ${this.testSuites[0]?.aiModel || 'gpt-5'}\n`
    report += `**Total Tests**: ${totalTests}\n`
    report += `**Passed**: ${passedTests} ✅\n`
    report += `**Failed**: ${failedTests} ❌\n`
    report += `**Duration**: ${this.formatDuration(totalDuration)}\n`
    report += `**Estimated Cost**: $${totalCost.toFixed(4)}\n\n`

    report += `## 📈 Summary\n\n`
    report += `- ✅ **Success Rate**: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`
    report += `- ⏱️ **Avg Response Time**: ${avgResponseTime.toFixed(1)}s\n`
    report += `- 🎯 **Avg Macro Achievement**: ${avgMacroAchievement.toFixed(1)}%\n\n`

    // Group results by scenario
    const scenarios = this.groupByScenario()

    for (const [scenario, results] of Object.entries(scenarios)) {
      const scenarioPassed = results.filter(r => r.passed).length
      const scenarioTotal = results.length

      report += `## ${this.getScenarioEmoji(scenario)} ${scenario} (${scenarioPassed}/${scenarioTotal} passed)\n\n`

      for (const result of results) {
        report += this.formatTestResult(result)
        report += '\n'
      }
    }

    // Failed tests section
    if (failedTests > 0) {
      report += `## ⚠️ Failed Tests\n\n`

      for (const suite of this.testSuites) {
        for (const result of suite.results.filter(r => !r.passed)) {
          report += `### ❌ ${result.testName}\n\n`
          report += `**Scenario**: ${result.scenario}\n`
          report += `**Meal**: ${result.mealName}\n`
          report += `**Targets**: P=${result.targets.protein}g, F=${result.targets.fat}g, C=${result.targets.carbs}g\n\n`

          // Initial ingredients section
          if (result.initialIngredients && result.initialIngredients.length > 0) {
            report += `**Initial Ingredients**:\n`
            for (const ing of result.initialIngredients) {
              report += `- ${ing.name}: ${ing.quantity}g (P=${ing.protein.toFixed(1)}g, F=${ing.fat.toFixed(1)}g, C=${ing.carbs.toFixed(1)}g)\n`
            }
            report += '\n'
          }

          report += `**Errors**:\n`
          for (const error of result.validation.errors) {
            report += `- ${error}\n`
          }
          report += '\n'
          if (result.aiComment) {
            report += `**AI Comment**: "${result.aiComment}"\n\n`
          }
          report += `**Recommendation**: ${this.getRecommendation(result)}\n\n`
        }
      }
    }

    // Insights section
    report += `## 💡 Insights\n\n`
    report += this.generateInsights()

    return report
  }

  /**
   * Save report to file
   */
  saveReport(report: string, filename?: string): string {
    const reportsDir = join(process.cwd(), 'tests/e2e-ai/reports')

    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                      new Date().toTimeString().split(' ')[0].replace(/:/g, '')
    const reportFilename = filename || `gpt5-optimization-${timestamp}.md`
    const reportPath = join(reportsDir, reportFilename)

    writeFileSync(reportPath, report, 'utf-8')

    // Also save as "latest" for easy access
    const latestPath = join(reportsDir, 'gpt5-optimization-latest.md')
    writeFileSync(latestPath, report, 'utf-8')

    return reportPath
  }

  // ========== Private Helper Methods ==========

  private formatTestResult(result: TestResult): string {
    const icon = result.passed ? '✅' : '❌'
    let output = `### ${icon} Test: ${result.testName}\n\n`
    output += `**Meal**: ${result.mealName}\n`
    output += `**Targets**: P=${result.targets.protein}g, F=${result.targets.fat}g, C=${result.targets.carbs}g\n\n`

    // Initial ingredients section
    if (result.initialIngredients && result.initialIngredients.length > 0) {
      output += `**Initial Ingredients**:\n`
      for (const ing of result.initialIngredients) {
        output += `- ${ing.name}: ${ing.quantity}g (P=${ing.protein.toFixed(1)}g, F=${ing.fat.toFixed(1)}g, C=${ing.carbs.toFixed(1)}g)\n`
      }
      output += '\n'
    }

    const val = result.validation
    output += `**Results**:\n`
    output += `- Protein: ${val.macroAchievement.protein.actual.toFixed(1)}g (${val.macroAchievement.protein.percentDifference >= 0 ? '+' : ''}${val.macroAchievement.protein.percentDifference.toFixed(1)}%) ${val.macroAchievement.protein.withinTolerance ? '✅' : '❌'}\n`
    output += `- Fat: ${val.macroAchievement.fat.actual.toFixed(1)}g (${val.macroAchievement.fat.percentDifference >= 0 ? '+' : ''}${val.macroAchievement.fat.percentDifference.toFixed(1)}%) ${val.macroAchievement.fat.withinTolerance ? '✅' : '❌'}\n`
    output += `- Carbs: ${val.macroAchievement.carbs.actual.toFixed(1)}g (${val.macroAchievement.carbs.percentDifference >= 0 ? '+' : ''}${val.macroAchievement.carbs.percentDifference.toFixed(1)}%) ${val.macroAchievement.carbs.withinTolerance ? '✅' : '❌'}\n`
    output += `- Response time: ${val.performanceMetrics.responseTime.toFixed(1)}s\n`
    output += `- Cost: ~$${val.performanceMetrics.estimatedCost.toFixed(4)}\n`
    output += `- Achievability: ${val.aiQuality.achievabilityScore} (${val.aiQuality.feasibility})\n\n`

    if (result.aiComment) {
      output += `**AI Comment**: "${result.aiComment}"\n\n`
    }

    return output
  }

  private groupByScenario(): Record<string, TestResult[]> {
    const grouped: Record<string, TestResult[]> = {}

    for (const suite of this.testSuites) {
      for (const result of suite.results) {
        if (!grouped[result.scenario]) {
          grouped[result.scenario] = []
        }
        grouped[result.scenario].push(result)
      }
    }

    return grouped
  }

  private getScenarioEmoji(scenario: string): string {
    if (scenario.toLowerCase().includes('breakfast')) return '🍳'
    if (scenario.toLowerCase().includes('lunch')) return '🍽️'
    if (scenario.toLowerCase().includes('dinner')) return '🥗'
    if (scenario.toLowerCase().includes('edge')) return '⚡'
    return '🔬'
  }

  private calculateTotalDuration(): number {
    let total = 0
    for (const suite of this.testSuites) {
      total += suite.endTime.getTime() - suite.startTime.getTime()
    }
    return total / 1000 // Convert to seconds
  }

  private calculateTotalCost(): number {
    let total = 0
    for (const suite of this.testSuites) {
      for (const result of suite.results) {
        total += result.validation.performanceMetrics.estimatedCost
      }
    }
    return total
  }

  private calculateAvgResponseTime(): number {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.results.length, 0)
    if (totalTests === 0) return 0

    let totalTime = 0
    for (const suite of this.testSuites) {
      for (const result of suite.results) {
        totalTime += result.validation.performanceMetrics.responseTime
      }
    }
    return totalTime / totalTests
  }

  private calculateAvgMacroAchievement(): number {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.results.length, 0)
    if (totalTests === 0) return 0

    let totalAchievement = 0
    for (const suite of this.testSuites) {
      for (const result of suite.results) {
        const val = result.validation
        const proteinMatch = 100 - Math.abs(val.macroAchievement.protein.percentDifference)
        const fatMatch = 100 - Math.abs(val.macroAchievement.fat.percentDifference)
        const carbsMatch = 100 - Math.abs(val.macroAchievement.carbs.percentDifference)
        totalAchievement += (proteinMatch + fatMatch + carbsMatch) / 3
      }
    }
    return totalAchievement / totalTests
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}m ${secs}s`
  }

  private getRecommendation(result: TestResult): string {
    const val = result.validation

    if (!val.macroAchievement.protein.withinTolerance && val.macroAchievement.protein.percentDifference < 0) {
      return 'Consider adding more protein-rich ingredients or increasing protein powder quantity'
    }
    if (!val.macroAchievement.fat.withinTolerance && val.macroAchievement.fat.percentDifference < 0) {
      return 'Consider adding healthy fats (oils, nuts, avocado)'
    }
    if (!val.macroAchievement.carbs.withinTolerance && val.macroAchievement.carbs.percentDifference < 0) {
      return 'Consider adding more carb sources (rice, oats, fruits)'
    }
    if (val.aiQuality.achievabilityScore < 50) {
      return 'Target macros may be unrealistic for this meal composition. Consider adjusting targets.'
    }
    return 'Review AI comment for specific suggestions'
  }

  private generateInsights(): string {
    let insights = ''

    const passRate = this.testSuites.reduce(
      (sum, suite) => sum + suite.results.filter(r => r.passed).length,
      0
    ) / this.testSuites.reduce((sum, suite) => sum + suite.results.length, 0)

    if (passRate > 0.9) {
      insights += '- ✅ GPT-5 performs excellently on these test scenarios (>90% pass rate)\n'
    } else if (passRate > 0.7) {
      insights += '- ⚠️ GPT-5 shows good performance but has room for improvement (70-90% pass rate)\n'
    } else {
      insights += '- ❌ GPT-5 struggles with current test scenarios (<70% pass rate)\n'
    }

    const avgTime = this.calculateAvgResponseTime()
    if (avgTime > 20) {
      insights += `- ⏱️ Response times are slow (avg ${avgTime.toFixed(1)}s). Consider using gpt-5-mini for faster results\n`
    } else {
      insights += `- ⚡ Response times are acceptable (avg ${avgTime.toFixed(1)}s)\n`
    }

    const failedTests = this.testSuites.flatMap(suite => suite.results.filter(r => !r.passed))
    if (failedTests.length > 0) {
      const commonIssues = this.identifyCommonIssues(failedTests)
      if (commonIssues.length > 0) {
        insights += `- 🔍 Common issues: ${commonIssues.join(', ')}\n`
      }
    }

    return insights
  }

  private identifyCommonIssues(failedTests: TestResult[]): string[] {
    const issues: string[] = []

    const proteinFailures = failedTests.filter(t => !t.validation.macroAchievement.protein.withinTolerance).length
    if (proteinFailures > failedTests.length * 0.5) {
      issues.push('protein targets difficult to achieve')
    }

    const highTargets = failedTests.filter(t =>
      t.targets.protein > 80 || t.targets.fat > 50 || t.targets.carbs > 120
    ).length
    if (highTargets > failedTests.length * 0.5) {
      issues.push('extreme macro targets')
    }

    return issues
  }
}
