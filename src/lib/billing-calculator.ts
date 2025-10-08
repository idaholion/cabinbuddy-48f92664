export interface BillingConfig {
  method: 'per-person-per-day' | 'per-person-per-week' | 
          'flat-rate-per-day' | 'flat-rate-per-week' |
          'per_person_per_night' | 'per_person_per_week' |
          'flat_rate_per_night' | 'flat_rate_per_week' | string;
  amount: number;
  taxRate?: number;
  cleaningFee?: number;
  petFee?: number;
  damageDeposit?: number;
  lateFeeAmount?: number;
  lateFeeDays?: number;
}

export interface StayDetails {
  guests: number;
  nights: number;
  weeks?: number;
  checkInDate: Date;
  checkOutDate: Date;
  seasonStartDate?: Date;
  seasonEndDate?: Date;
}

export interface BillingBreakdown {
  baseAmount: number;
  cleaningFee: number;
  petFee: number;
  damageDeposit: number;
  subtotal: number;
  tax: number;
  total: number;
  details: string;
}

export class BillingCalculator {
  static calculateStayBilling(config: BillingConfig, stay: StayDetails): BillingBreakdown {
    const baseAmount = this.calculateBaseAmount(config, stay);
    const cleaningFee = config.cleaningFee || 0;
    const petFee = config.petFee || 0;
    const damageDeposit = config.damageDeposit || 0;
    
    const subtotal = baseAmount + cleaningFee + petFee;
    const tax = config.taxRate ? (subtotal * config.taxRate) / 100 : 0;
    const total = subtotal + tax + damageDeposit;
    
    const details = this.generateBillingDetails(config, stay, baseAmount);
    
    return {
      baseAmount,
      cleaningFee,
      petFee,
      damageDeposit,
      subtotal,
      tax,
      total,
      details
    };
  }
  
  private static calculateBaseAmount(config: BillingConfig, stay: StayDetails): number {
    // Normalize method to handle both kebab-case and snake_case, and night/day variations
    const normalizedMethod = config.method?.toLowerCase().replace(/_/g, '-').replace('night', 'day');
    
    switch (normalizedMethod) {
      case 'per-person-per-day':
        return stay.guests * stay.nights * config.amount;
        
      case 'per-person-per-week':
        const weeks = stay.weeks || Math.ceil(stay.nights / 7);
        return stay.guests * weeks * config.amount;
        
        
      case 'flat-rate-per-day':
        return stay.nights * config.amount;
        
      case 'flat-rate-per-week':
        const weeksFlat = stay.weeks || Math.ceil(stay.nights / 7);
        return weeksFlat * config.amount;
        
      default:
        throw new Error(`Unknown billing method: ${config.method}`);
    }
  }
  
  private static generateBillingDetails(config: BillingConfig, stay: StayDetails, baseAmount: number): string {
    // Normalize method to handle both kebab-case and snake_case, and night/day variations
    const normalizedMethod = config.method?.toLowerCase().replace(/_/g, '-').replace('night', 'day');
    
    switch (normalizedMethod) {
      case 'per-person-per-day':
        return `${stay.guests} guests × ${stay.nights} nights × $${config.amount}/person/day = $${baseAmount}`;
        
      case 'per-person-per-week':
        const weeks = stay.weeks || Math.ceil(stay.nights / 7);
        return `${stay.guests} guests × ${weeks} weeks × $${config.amount}/person/week = $${baseAmount}`;
        
        
      case 'flat-rate-per-day':
        return `${stay.nights} nights × $${config.amount}/day = $${baseAmount}`;
        
      case 'flat-rate-per-week':
        const weeksFlat = stay.weeks || Math.ceil(stay.nights / 7);
        return `${weeksFlat} weeks × $${config.amount}/week = $${baseAmount}`;
        
      default:
        return `Base amount = $${baseAmount}`;
    }
  }
  
  static validateBillingConfig(config: BillingConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.method) {
      errors.push('Billing method is required');
    }
    
    if (!config.amount || config.amount <= 0) {
      errors.push('Billing amount must be greater than 0');
    }
    
    if (config.taxRate && (config.taxRate < 0 || config.taxRate > 100)) {
      errors.push('Tax rate must be between 0 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Calculate billing from daily occupancy data (actual guest counts per day)
   */
  static calculateFromDailyOccupancy(
    config: BillingConfig,
    dailyOccupancyData: Record<string, number>, // { "day-1": 4, "day-2": 3, etc. }
    stayDates: { startDate: Date; endDate: Date }
  ): BillingBreakdown & { dayBreakdown: Array<{ date: string; guests: number; cost: number }> } {
    const dayBreakdown: Array<{ date: string; guests: number; cost: number }> = [];
    let baseAmount = 0;

    // Calculate per-day based on billing method
    const days = Object.keys(dailyOccupancyData).sort();
    
    if (days.length === 0) {
      // Fallback to standard calculation if no daily data
      // Only count nights spent (exclude checkout day)
      const nights = Math.floor((stayDates.endDate.getTime() - stayDates.startDate.getTime()) / (1000 * 3600 * 24));
      return {
        ...this.calculateStayBilling(config, {
          guests: 0,
          nights,
          checkInDate: stayDates.startDate,
          checkOutDate: stayDates.endDate
        }),
        dayBreakdown: []
      };
    }

    // Calculate cost for each day
    console.log('Starting day-by-day calculation...');
    days.forEach((dayKey, index) => {
      const guests = dailyOccupancyData[dayKey] || 0;
      // Use the actual date key instead of calculating from index
      const date = dayKey;
      
      let dayCost = 0;
      
      // Normalize method to handle both kebab-case and snake_case, and night/day variations
      const normalizedMethod = config.method?.toLowerCase().replace(/_/g, '-').replace('night', 'day');
      
      switch (normalizedMethod) {
        case 'per-person-per-day':
          dayCost = guests * config.amount;
          break;
          
        case 'per-person-per-week':
          // Pro-rate weekly cost to daily
          dayCost = (guests * config.amount) / 7;
          break;
          
        case 'flat-rate-per-day':
          // Only charge flat rate if there are guests
          dayCost = guests > 0 ? config.amount : 0;
          break;
          
        case 'flat-rate-per-week':
          // Pro-rate weekly cost to daily, only if there are guests
          dayCost = guests > 0 ? config.amount / 7 : 0;
          break;
          
        default:
          dayCost = 0;
      }
      
      console.log(`Day ${index + 1} (${date}): ${guests} guests × $${config.amount} = $${dayCost}`);
      baseAmount += dayCost;
      console.log(`  Running baseAmount: $${baseAmount}`);
      
      dayBreakdown.push({
        date,
        guests,
        cost: dayCost
      });
    });

    // Add fees and calculate totals
    const cleaningFee = config.cleaningFee || 0;
    const petFee = config.petFee || 0;
    const damageDeposit = config.damageDeposit || 0;
    
    console.log('Final baseAmount before fees:', baseAmount);
    console.log('Fees - cleaning:', cleaningFee, 'pet:', petFee, 'deposit:', damageDeposit);
    
    const subtotal = baseAmount + cleaningFee + petFee;
    const tax = config.taxRate ? (subtotal * config.taxRate) / 100 : 0;
    const total = subtotal + tax + damageDeposit;

    console.log('Subtotal:', subtotal, 'Tax:', tax, 'Total:', total);

    return {
      baseAmount,
      cleaningFee,
      petFee,
      damageDeposit,
      subtotal,
      tax,
      total,
      details: `Calculated from ${days.length} days of actual occupancy`,
      dayBreakdown
    };
  }
}