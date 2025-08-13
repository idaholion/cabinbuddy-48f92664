export interface BillingConfig {
  method: 'per-person-per-day' | 'per-person-per-week' | 
          'flat-rate-per-day' | 'flat-rate-per-week' | 'flat-rate-per-season';
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
    switch (config.method) {
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
        
        
      case 'flat-rate-per-season':
        if (!stay.seasonStartDate || !stay.seasonEndDate) {
          throw new Error('Season dates required for seasonal billing');
        }
        // Check if stay overlaps with season
        const stayStart = stay.checkInDate.getTime();
        const stayEnd = stay.checkOutDate.getTime();
        const seasonStart = stay.seasonStartDate.getTime();
        const seasonEnd = stay.seasonEndDate.getTime();
        
        if (stayStart >= seasonStart && stayEnd <= seasonEnd) {
          return config.amount;
        }
        throw new Error('Stay dates fall outside of season billing period');
        
      default:
        throw new Error(`Unknown billing method: ${config.method}`);
    }
  }
  
  private static generateBillingDetails(config: BillingConfig, stay: StayDetails, baseAmount: number): string {
    switch (config.method) {
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
        
        
      case 'flat-rate-per-season':
        return `Seasonal flat rate = $${baseAmount}`;
        
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
}