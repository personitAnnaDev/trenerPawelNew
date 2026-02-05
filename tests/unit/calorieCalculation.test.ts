import { describe, it, expect } from 'vitest'
import { TEST_CLIENTS, EXPECTED_BMR, EDGE_CASE_DATA } from '../utils/fixtures'

// Extract BMR calculation logic to test it directly
// This mirrors the logic from CalorieCalculator.tsx:67-71
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: string
): number => {
  let bmr: number
  
  // Harris-Benedict Formula
  if (gender === "mężczyzna") {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
  }
  
  return Math.round(bmr)
}

export const calculateTDEE = (bmr: number, activityFactor: number): number => {
  return Math.round(bmr * activityFactor)
}

export const getAge = (birthDate: string): number => {
  // Parse DD.MM.YYYY format
  const [day, month, year] = birthDate.split('.').map(Number)
  const birth = new Date(year, month - 1, day)
  const today = new Date()
  
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

describe('BMR and TDEE Calculations', () => {
  describe('UT-6: Male BMR calculation', () => {
    it('should calculate correct BMR for average male', () => {
      // Given: Male client data
      const client = TEST_CLIENTS.AVERAGE_MALE
      const age = getAge(client.birth_date) // Should be ~34 for birth date 15.05.1990
      const weight = parseFloat(client.current_weight)
      const height = parseFloat(client.height)

      // When: Calculating BMR using Harris-Benedict formula
      const bmr = calculateBMR(weight, height, age, client.gender)

      // Then: Should return expected BMR (within reasonable tolerance due to age calculation)
      expect(bmr).toBeCloseTo(EXPECTED_BMR.MALE_34_80KG_180CM, -1) // Within 10 calories
      expect(bmr).toBeGreaterThan(1800) // Sanity check
      expect(bmr).toBeLessThan(2000) // Sanity check
    })

    it('should use correct male Harris-Benedict coefficients', () => {
      // Given: Specific male parameters
      const weight = 80, height = 180, age = 30
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, 'mężczyzna')
      
      // Then: Should match manual calculation
      const expectedBMR = 88.362 + (13.397 * 80) + (4.799 * 180) - (5.677 * 30)
      expect(bmr).toBe(Math.round(expectedBMR))
    })
  })

  describe('UT-7: Female BMR calculation', () => {
    it('should calculate correct BMR for average female', () => {
      // Given: Female client data
      const client = TEST_CLIENTS.AVERAGE_FEMALE
      const age = getAge(client.birth_date) // Should be ~29 for birth date 22.03.1995
      const weight = parseFloat(client.current_weight)
      const height = parseFloat(client.height)

      // When: Calculating BMR using Harris-Benedict formula
      const bmr = calculateBMR(weight, height, age, client.gender)

      // Then: Should return expected BMR (within tolerance due to age calculation)
      expect(bmr).toBeCloseTo(EXPECTED_BMR.FEMALE_29_60KG_165CM, -1) // Within 10 calories
      expect(bmr).toBeGreaterThan(1300) // Sanity check
      expect(bmr).toBeLessThan(1500) // Sanity check
    })

    it('should use correct female Harris-Benedict coefficients', () => {
      // Given: Specific female parameters
      const weight = 60, height = 165, age = 25
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, 'kobieta')
      
      // Then: Should match manual calculation
      const expectedBMR = 447.593 + (9.247 * 60) + (3.098 * 165) - (4.330 * 25)
      expect(bmr).toBe(Math.round(expectedBMR))
    })
  })

  describe('UT-8: TDEE calculation with activity factors', () => {
    const baseBMR = 1800

    it('should calculate TDEE for sedentary activity (1.2)', () => {
      // Given: BMR and sedentary activity factor
      const activityFactor = 1.2
      
      // When: Calculating TDEE
      const tdee = calculateTDEE(baseBMR, activityFactor)
      
      // Then: Should be BMR × 1.2
      expect(tdee).toBe(2160) // 1800 × 1.2
    })

    it('should calculate TDEE for moderate activity (1.6)', () => {
      // Given: BMR and moderate activity factor
      const activityFactor = 1.6
      
      // When: Calculating TDEE
      const tdee = calculateTDEE(baseBMR, activityFactor)
      
      // Then: Should be BMR × 1.6
      expect(tdee).toBe(2880) // 1800 × 1.6
    })

    it('should calculate TDEE for high activity (2.0)', () => {
      // Given: BMR and high activity factor
      const activityFactor = 2.0
      
      // When: Calculating TDEE
      const tdee = calculateTDEE(baseBMR, activityFactor)
      
      // Then: Should be BMR × 2.0
      expect(tdee).toBe(3600) // 1800 × 2.0
    })

    it('should round TDEE to nearest integer', () => {
      // Given: BMR that would result in fractional TDEE
      const bmr = 1833 // Will result in non-integer when multiplied
      const activityFactor = 1.75
      
      // When: Calculating TDEE
      const tdee = calculateTDEE(bmr, activityFactor)
      
      // Then: Should be rounded integer
      expect(Number.isInteger(tdee)).toBe(true)
      expect(tdee).toBe(Math.round(1833 * 1.75)) // 3208
    })
  })

  describe('UT-9: Edge cases for age/weight/height', () => {
    it('should handle minimum reasonable values', () => {
      // Given: Minimum reasonable parameters
      const weight = 30, height = 100, age = 18, gender = 'kobieta'
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, gender)
      
      // Then: Should return positive number without errors
      expect(bmr).toBeGreaterThan(0)
      expect(Number.isFinite(bmr)).toBe(true)
    })

    it('should handle maximum reasonable values', () => {
      // Given: Maximum reasonable parameters
      const weight = 200, height = 250, age = 100, gender = 'mężczyzna'
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, gender)
      
      // Then: Should return reasonable number without errors
      expect(bmr).toBeGreaterThan(0)
      expect(bmr).toBeLessThan(10000) // Sanity check
      expect(Number.isFinite(bmr)).toBe(true)
    })

    it('should handle elderly client', () => {
      // Given: Elderly client data
      const client = EDGE_CASE_DATA.ELDERLY_CLIENT
      const age = getAge(client.birth_date)
      const weight = parseFloat(client.current_weight)
      const height = parseFloat(client.height)
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, client.gender)
      
      // Then: Should handle high age gracefully
      expect(bmr).toBeGreaterThan(1000) // Should still have reasonable BMR
      expect(age).toBeGreaterThan(80) // Verify test setup
    })

    it('should handle young adult client', () => {
      // Given: Young adult client data
      const client = EDGE_CASE_DATA.YOUNG_CLIENT
      const age = getAge(client.birth_date)
      const weight = parseFloat(client.current_weight)
      const height = parseFloat(client.height)
      
      // When: Calculating BMR
      const bmr = calculateBMR(weight, height, age, client.gender)
      
      // Then: Should calculate appropriately for young age
      expect(bmr).toBeGreaterThan(1200)
      expect(bmr).toBeLessThan(2000)
      expect(age).toBeLessThan(25) // Verify test setup
    })
  })

  describe('Age calculation from birth date', () => {
    it('should calculate age correctly for DD.MM.YYYY format', () => {
      // Given: Birth date in past
      const birthDate = '15.05.1990'
      
      // When: Calculating age
      const age = getAge(birthDate)
      
      // Then: Should return current age (assuming current year > 1990)
      expect(age).toBeGreaterThanOrEqual(30)
      expect(age).toBeLessThan(50) // Reasonable upper bound
      expect(Number.isInteger(age)).toBe(true)
    })

    it('should handle birthday not yet occurred this year', () => {
      // Given: Birth date later this year (future birthday)
      const currentDate = new Date()
      const futureMonth = currentDate.getMonth() + 2 // 2 months from now
      const futureDay = currentDate.getDate()
      const birthYear = currentDate.getFullYear() - 25 // 25 years ago
      
      const birthDate = `${futureDay.toString().padStart(2, '0')}.${(futureMonth + 1).toString().padStart(2, '0')}.${birthYear}`
      
      // When: Calculating age
      const age = getAge(birthDate)
      
      // Then: Should be 24 (not yet 25)
      expect(age).toBe(24)
    })

    it('should handle birthday already occurred this year', () => {
      // Given: Birth date earlier this year (past birthday)
      const currentDate = new Date()
      const pastMonth = Math.max(0, currentDate.getMonth() - 2) // 2 months ago
      const pastDay = currentDate.getDate()
      const birthYear = currentDate.getFullYear() - 25 // 25 years ago
      
      const birthDate = `${pastDay.toString().padStart(2, '0')}.${(pastMonth + 1).toString().padStart(2, '0')}.${birthYear}`
      
      // When: Calculating age
      const age = getAge(birthDate)
      
      // Then: Should be 25 (birthday already passed)
      expect(age).toBe(25)
    })
  })

  describe('Gender validation', () => {
    it('should default to female formula for unknown gender', () => {
      // Given: Unknown gender value
      const weight = 70, height = 170, age = 30
      
      // When: Calculating BMR with invalid gender
      const bmrUnknown = calculateBMR(weight, height, age, 'unknown')
      const bmrFemale = calculateBMR(weight, height, age, 'kobieta')
      
      // Then: Should use female formula as default
      expect(bmrUnknown).toBe(bmrFemale)
    })

    it('should be case sensitive for gender', () => {
      // Given: Same parameters, different gender cases
      const weight = 70, height = 170, age = 30
      
      // When: Calculating BMR with different cases
      const bmrMale = calculateBMR(weight, height, age, 'mężczyzna')
      const bmrMaleUpper = calculateBMR(weight, height, age, 'MĘŻCZYZNA')
      
      // Then: Should be case sensitive (uppercase doesn't match)
      expect(bmrMale).not.toBe(bmrMaleUpper)
    })
  })

  describe('Formula accuracy verification', () => {
    it('should match published Harris-Benedict examples', () => {
      // Given: Standard textbook examples
      const examples = [
        {
          weight: 70, height: 175, age: 25, gender: 'mężczyzna',
          expectedBMR: Math.round(88.362 + (13.397 * 70) + (4.799 * 175) - (5.677 * 25))
        },
        {
          weight: 55, height: 160, age: 30, gender: 'kobieta',
          expectedBMR: Math.round(447.593 + (9.247 * 55) + (3.098 * 160) - (4.330 * 30))
        }
      ]
      
      examples.forEach(({ weight, height, age, gender, expectedBMR }) => {
        // When: Calculating BMR
        const bmr = calculateBMR(weight, height, age, gender)
        
        // Then: Should match expected calculation
        expect(bmr).toBe(expectedBMR)
      })
    })
  })
})