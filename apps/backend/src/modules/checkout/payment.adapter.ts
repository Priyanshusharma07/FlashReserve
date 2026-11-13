import { Injectable } from '@nestjs/common';
import { ulid } from 'ulidx';

export interface PaymentResult {
  success: boolean;
  transactionReference: string;
  errorMessage?: string;
}

export interface IPaymentAdapter {
  processPayment(token: string, amountCents: number): Promise<PaymentResult>;
}

@Injectable()
export class MockDevelopmentPaymentAdapter implements IPaymentAdapter {
  async processPayment(token: string, _amountCents: number): Promise<PaymentResult> {
    // Fail if token explicitly starts with 'tok_fail' for testing purposes
    if (token.startsWith('tok_fail')) {
      return {
        success: false,
        transactionReference: `err_${ulid()}`,
        errorMessage: 'Card declined: insufficient funds (simulated)',
      };
    }

    return {
      success: true,
      transactionReference: `ch_mock_${ulid()}`,
    };
  }
}
