/**
 * 本地 API 测试端点
 * 用于验证 SQLite 数据库和本地 API 是否正常工作
 */

import { NextResponse } from 'next/server';
import { getDatabase, createCompanyWithOwner, generateId, getCurrentDate } from '@/lib/database';

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    // 测试 1: 数据库连接
    const db = getDatabase();
    results.tests.databaseConnection = {
      success: !!db,
      message: db ? '数据库连接成功' : '数据库连接失败',
    };

    // 测试 2: 表结构验证
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all() as { name: string }[];

    const expectedTables = [
      'companies', 'financial_settings', 'invitations',
      'profiles', 'sessions', 'stores',
      'transaction_categories', 'transactions', 'users'
    ];

    const tableNames = tables.map(t => t.name).filter(n => !n.startsWith('sqlite_'));
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    results.tests.tableStructure = {
      success: missingTables.length === 0,
      tables: tableNames,
      missingTables,
      message: missingTables.length === 0
        ? `所有 ${expectedTables.length} 张表都已创建`
        : `缺少表: ${missingTables.join(', ')}`,
    };

    // 测试 3: ID 生成
    const testId = generateId();
    results.tests.idGeneration = {
      success: testId.length === 32,
      generatedId: testId,
      message: testId.length === 32 ? 'ID 生成正常' : 'ID 格式异常',
    };

    // 测试 4: 日期函数
    const testDate = getCurrentDate();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    results.tests.dateFunction = {
      success: dateRegex.test(testDate),
      generatedDate: testDate,
      message: dateRegex.test(testDate) ? '日期格式正确' : '日期格式异常',
    };

    // 测试 5: 统计现有数据
    const stats = {
      companies: (db.prepare('SELECT COUNT(*) as count FROM companies').get() as any).count,
      users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
      stores: (db.prepare('SELECT COUNT(*) as count FROM stores').get() as any).count,
      transactions: (db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any).count,
      categories: (db.prepare('SELECT COUNT(*) as count FROM transaction_categories').get() as any).count,
    };

    results.tests.dataStats = {
      success: true,
      stats,
      message: `数据统计: ${stats.companies} 家公司, ${stats.users} 个用户, ${stats.stores} 个店铺, ${stats.transactions} 条交易, ${stats.categories} 个分类`,
    };

    // 总结
    const allTests = Object.values(results.tests) as { success: boolean }[];
    const passedTests = allTests.filter(t => t.success).length;
    results.summary = {
      total: allTests.length,
      passed: passedTests,
      failed: allTests.length - passedTests,
      success: passedTests === allTests.length,
    };

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      ...results,
      error: {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
      },
    }, { status: 500 });
  }
}

/**
 * POST: 创建测试公司和用户
 */
export async function POST() {
  try {
    const testCompanyName = `测试公司_${Date.now()}`;
    const testUsername = `testuser_${Date.now()}`;

    const result = await createCompanyWithOwner({
      companyName: testCompanyName,
      ownerUsername: testUsername,
      ownerPassword: 'test123456',
      ownerFullName: '测试用户',
    });

    const db = getDatabase();

    // 验证创建结果
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.companyId);
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(result.userId);
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.userId);
    const categories = db.prepare('SELECT COUNT(*) as count FROM transaction_categories WHERE company_id = ?').get(result.companyId) as { count: number };

    return NextResponse.json({
      success: true,
      message: '测试公司创建成功',
      data: {
        companyId: result.companyId,
        userId: result.userId,
        company,
        user,
        profile,
        systemCategoriesCount: categories.count,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
