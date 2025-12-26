#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 禁止提交的文件列表
const RESTRICTED_FILES = [
  'src/lib/mock-sse-data.ts'
];

// 获取暂存区的文件列表
const getStagedFiles = () => {
  try {
    const result = require('child_process').execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('获取暂存区文件失败:', error.message);
    return [];
  }
};

// 检查是否有禁止提交的文件
const checkRestrictedFiles = (stagedFiles) => {
  const restrictedFiles = stagedFiles.filter(file => 
    RESTRICTED_FILES.includes(file)
  );

  if (restrictedFiles.length > 0) {
    console.error('❌ 检测到禁止提交的文件:');
    restrictedFiles.forEach(file => {
      console.error(`   - ${file}`);
    });
    console.error('\n⚠️  这些文件包含敏感数据或仅供调试使用，请勿提交到版本库。');
    console.error('\n如果需要提交，请使用以下命令从暂存区移除:');
    restrictedFiles.forEach(file => {
      console.error(`   git restore --staged ${file}`);
    });
    console.error('\n或者使用 --no-verify 跳过检查（不推荐）');
    return false;
  }

  return true;
};

// 主函数
const main = () => {
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('✅ 暂存区没有文件，检查通过');
    process.exit(0);
  }

  const hasRestrictedFiles = checkRestrictedFiles(stagedFiles);
  
  if (!hasRestrictedFiles) {
    process.exit(1);
  }

  console.log('✅ 所有文件检查通过，可以提交');
  process.exit(0);
};

// 执行主函数
if (require.main === module) {
  main();
}
