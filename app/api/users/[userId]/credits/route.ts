/**
 * Credit Wallet API Routes
 * RESTful endpoints for credit wallet operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserCreditWallet,
  addCredits,
  deductCredits,
  getTransactionHistory,
  getCreditUsageAnalytics,
  hasEnoughCredits,
  getUserCreditSummary,
  refundCredits,
  initializeWallet,
} from '@/lib/services/creditWallet.service';
import { verifyAuth } from '@/lib/auth';

// ============================================================================
// GET WALLET INFO
// ============================================================================
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const action = req.nextUrl.searchParams.get('action');

    // Verify authentication
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to view their own wallet or admins
    if (user.id !== params.userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    switch (action) {
      case 'history':
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
        const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
        const history = await getTransactionHistory(params.userId, limit, offset);
        return NextResponse.json({ data: history }, { status: 200 });

      case 'analytics':
        const analytics = await getCreditUsageAnalytics(params.userId);
        return NextResponse.json({ data: analytics }, { status: 200 });

      case 'summary':
        const summary = await getUserCreditSummary(params.userId);
        return NextResponse.json({ data: summary }, { status: 200 });

      default:
        const wallet = await getUserCreditWallet(params.userId);
        if (!wallet) {
          return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }
        return NextResponse.json({ data: wallet }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in GET wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================================================
// ADD CREDITS (Admin only)
// ============================================================================
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const body = await req.json();
    const {
      amount,
      creditType = 'base',
      transactionType = 'bonus_added',
      description,
      reason,
      razorpayPaymentId,
      razorpayOrderId,
    } = body;

    if (!amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description' },
        { status: 400 }
      );
    }

    const result = await addCredits(
      params.userId,
      amount,
      creditType,
      transactionType,
      description,
      {
        adminId: user.id,
        reason,
        razorpayPaymentId,
        razorpayOrderId,
      }
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DEDUCT CREDITS
// ============================================================================
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = req.nextUrl.searchParams.get('action');

    if (action === 'deduct') {
      const { amount, serviceType, reason, courseId, batchId, sessionId, lessonId, aiPrompt } = body;

      if (!amount || !serviceType || !reason) {
        return NextResponse.json(
          { error: 'Missing required fields: amount, serviceType, reason' },
          { status: 400 }
        );
      }

      // Check if user has enough credits
      const hasCredits = await hasEnoughCredits(params.userId, amount);
      if (!hasCredits) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }

      const result = await deductCredits(
        params.userId,
        amount,
        serviceType,
        reason,
        { courseId, batchId, sessionId, lessonId, aiPrompt }
      );

      return NextResponse.json({ data: result }, { status: 200 });
    }

    if (action === 'refund') {
      // Only admins can refund
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
      }

      const { amount, creditType = 'base', reason } = body;

      if (!amount || !reason) {
        return NextResponse.json(
          { error: 'Missing required fields: amount, reason' },
          { status: 400 }
        );
      }

      const result = await refundCredits(params.userId, amount, creditType, reason, user.id);

      return NextResponse.json({ data: result }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in PATCH wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// INITIALIZE WALLET
// ============================================================================
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await verifyAuth(req);
    if (!user || (user.id !== params.userId && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await initializeWallet(params.userId);
    return NextResponse.json({ data: wallet }, { status: 200 });
  } catch (error) {
    console.error('Error initializing wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
