// ===== EOQ 教学工具 - 计算逻辑验证测试 =====

let passed = 0, failed = 0;
function assert(name, actual, expected, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) < tolerance;
  if (ok) { passed++; console.log("  PASS " + name + ": " + actual.toFixed(2) + " (期望 " + expected.toFixed(2) + ")"); }
  else { failed++; console.log("  FAIL " + name + ": " + actual.toFixed(2) + " (期望 " + expected.toFixed(2) + ")"); }
}

console.log("\n===== 1. 经典EOQ计算 =====");
{
  const D=1000, S=200, H=5;
  const eoq = Math.sqrt(2*D*S/H);
  const tcMin = (eoq/2)*H + (D/eoq)*S;
  const N = D/eoq;
  const cycle = 365/N;
  const holding = (eoq/2)*H;
  const ordering = (D/eoq)*S;
  
  console.log("  D=" + D + ", S=" + S + ", H=" + H);
  assert("EOQ", eoq, 282.84);
  assert("最低TC", tcMin, 1414.21);
  assert("订货次数N", N, 3.536);
  assert("周期T(天)", cycle, 103.24);
  assert("持有成本", holding, 707.11);
  assert("订货成本", ordering, 707.11);
  console.log("  验证: 持有=订货=" + holding.toFixed(2) + " (EOQ点处两者相等)");
}

console.log("\n===== 2. 折扣EOQ计算（默认参数 rate模式）=====");
{
  const D=10000, S=100, r=0.20;
  const tiers = [
    {idx:1, qmin:0, qmax:499, price:10},
    {idx:2, qmin:500, qmax:999, price:9.5},
    {idx:3, qmin:1000, qmax:Infinity, price:9}
  ];
  
  console.log("  D=" + D + ", S=" + S + ", r=" + r);
  console.log("  区间: 0-499@10元, 500-999@9.5元, 1000+@9元\n");
  
  const results = tiers.map(tier => {
    const Hi = r * tier.price;
    const eoqI = Math.sqrt(2*D*S/Hi);
    let feasibleQ, tcFeasible, status;
    
    if(eoqI >= tier.qmin && eoqI <= tier.qmax) {
      feasibleQ = eoqI; status = "EOQ可行";
      tcFeasible = (eoqI/2)*Hi + (D/eoqI)*S + D*tier.price;
    } else if(eoqI < tier.qmin) {
      feasibleQ = tier.qmin; status = "取边界Qmin";
      tcFeasible = (tier.qmin/2)*Hi + (D/tier.qmin)*S + D*tier.price;
    } else {
      feasibleQ = null; status = "不可行"; tcFeasible = null;
    }
    
    console.log("  区间" + tier.idx + ": P=" + tier.price + ", H=" + Hi.toFixed(2) + ", EOQ=" + eoqI.toFixed(1) + ", " + status + 
      (tcFeasible ? ", TC=" + tcFeasible.toFixed(0) : ""));
    return Object.assign({}, tier, {Hi, eoqI, feasibleQ, tcFeasible, status});
  });
  
  const best = results.filter(r=>r.tcFeasible!==null).reduce((min,r)=>r.tcFeasible<min.tcFeasible?r:min, {tcFeasible:Infinity});
  console.log("\n  最优: 区间" + best.idx + ", Q=" + Math.round(best.feasibleQ) + ", TC=" + best.tcFeasible.toFixed(0));
  
  assert("区间1 EOQ", results[0].eoqI, 1000);
  assert("区间1状态(EOQ>Qmax应为不可行)", results[0].status === "不可行" ? 1 : 0, 1, 0);
  assert("区间2 EOQ", results[1].eoqI, 1025.9, 1);
  assert("区间2状态(EOQ>Qmax应为不可行)", results[1].status === "不可行" ? 1 : 0, 1, 0);
  assert("区间3 EOQ", results[2].eoqI, 1054.1, 1);
  assert("区间3状态(应为EOQ可行)", results[2].status === "EOQ可行" ? 1 : 0, 1, 0);
  assert("最优TC", best.tcFeasible, 91897, 5);
}

console.log("\n===== 3. 敏感性分析 =====");
{
  const D=1000, S=200, H=5;
  const eoq = Math.sqrt(2*D*S/H);
  const baseTC = (eoq/2)*H + (D/eoq)*S;
  
  console.log("  EOQ=" + eoq.toFixed(1) + ", baseTC=" + baseTC.toFixed(2) + "\n");
  
  const offsets = [-0.4,-0.2,0,0.2,0.4];
  console.log("  偏离    Q      持有    订货    TC      增幅%");
  offsets.forEach(off => {
    const q = Math.round(eoq*(1+off));
    const hc = (q/2)*H;
    const oc = (D/q)*S;
    const tc = hc+oc;
    const pct = ((tc-baseTC)/baseTC)*100;
    const label = off===0 ? "EOQ" : (off>0?"+":"") + (off*100) + "%";
    console.log("  " + label.padEnd(6) + "  " + q + "    " + hc.toFixed(0).padStart(5) + "  " + oc.toFixed(0).padStart(5) + "  " + tc.toFixed(0).padStart(5) + "   " + (pct>=0?"+":"") + pct.toFixed(2) + "%");
  });
  
  // 验证理论值: TC(Q)/TC_min = 0.5*(Q/EOQ + EOQ/Q)
  const q20 = eoq*1.2;
  const theory20 = (0.5*(1.2 + 1/1.2) - 1) * 100;
  const actual20 = ((q20/2)*H + (D/q20)*S - baseTC)/baseTC * 100;
  assert("+20%理论增幅", actual20, theory20, 0.1);
  
  const qn20 = eoq*0.8;
  const theoryN20 = (0.5*(0.8 + 1/0.8) - 1) * 100;
  const actualN20 = ((qn20/2)*H + (D/qn20)*S - baseTC)/baseTC * 100;
  assert("-20%理论增幅", actualN20, theoryN20, 0.1);
  
  console.log("\n  教学直觉: 偏离+20%→成本仅增" + theory20.toFixed(2) + "%, 偏离-20%→增" + theoryN20.toFixed(2) + "%");
}

console.log("\n===== 4. 库存锯齿图 =====");
{
  const D=1000, S=200, H=5, L=5;
  const eoq = Math.sqrt(2*D*S/H);
  const N = D/eoq;
  const T = 365/N;
  const rop = (D/365)*L;
  const avgInv = eoq/2;
  
  console.log("  EOQ=" + eoq.toFixed(1) + ", T=" + T.toFixed(1) + "天, N=" + N.toFixed(2));
  assert("ROP", rop, 13.70, 0.5);
  assert("平均库存", avgInv, 141.42, 0.5);
  
  // 验证锯齿波形
  const inv0 = eoq - (eoq/T)*0;
  const invHalfT = eoq - (eoq/T)*(T/2);
  const invAlmostT = eoq - (eoq/T)*(T-0.01);
  assert("day=0 库存=EOQ", inv0, eoq, 0.5);
  assert("day=T/2 库存=EOQ/2", invHalfT, eoq/2, 0.5);
  assert("day~T 库存~0", invAlmostT, 0, 0.5);
}

console.log("\n===== 5. 折扣EOQ - 固定H模式 =====");
{
  const D=10000, S=100, Hfixed=5;
  const tiers = [
    {idx:1, qmin:0, qmax:499, price:10},
    {idx:2, qmin:500, qmax:999, price:9.5},
    {idx:3, qmin:1000, qmax:Infinity, price:9}
  ];
  
  console.log("  D=" + D + ", S=" + S + ", H固定=" + Hfixed + "\n");
  
  const results = tiers.map(tier => {
    const Hi = Hfixed;
    const eoqI = Math.sqrt(2*D*S/Hi);
    let feasibleQ, tcFeasible, status;
    
    if(eoqI >= tier.qmin && eoqI <= tier.qmax) {
      feasibleQ = eoqI; status = "EOQ可行";
      tcFeasible = (eoqI/2)*Hi + (D/eoqI)*S + D*tier.price;
    } else if(eoqI < tier.qmin) {
      feasibleQ = tier.qmin; status = "取边界Qmin";
      tcFeasible = (tier.qmin/2)*Hi + (D/tier.qmin)*S + D*tier.price;
    } else {
      feasibleQ = null; status = "不可行"; tcFeasible = null;
    }
    
    console.log("  区间" + tier.idx + ": P=" + tier.price + ", H=" + Hi + ", EOQ=" + eoqI.toFixed(1) + ", " + status + 
      (tcFeasible ? ", TC=" + tcFeasible.toFixed(0) : ""));
    return Object.assign({}, tier, {Hi, eoqI, feasibleQ, tcFeasible, status});
  });
  
  assert("固定H模式EOQ", results[0].eoqI, 632.5, 1);
  assert("区间2可行", results[1].status === "EOQ可行" ? 1 : 0, 1, 0);
  assert("区间1不可行", results[0].status === "不可行" ? 1 : 0, 1, 0);
  assert("区间3取边界", results[2].status === "取边界Qmin" ? 1 : 0, 1, 0);
  
  const best = results.filter(r=>r.tcFeasible!==null).reduce((min,r)=>r.tcFeasible<min.tcFeasible?r:min, {tcFeasible:Infinity});
  console.log("\n  最优: 区间" + best.idx + ", Q=" + Math.round(best.feasibleQ) + ", TC=" + best.tcFeasible.toFixed(0));
}

console.log("\n===== 6. 代码Bug分析 =====");
console.log("\n  [BUG-1] syncSliderInput对所有滑块都调用updateClassicChart()");
console.log("    折扣面板的D/S/r/H滑块改变时，调用updateClassicChart()而非updateDiscountChart()");
console.log("    => 折扣图表不会随折扣面板参数变化而更新！");
console.log("    严重程度: CRITICAL");

console.log("\n  [BUG-2] 锯齿图补货时点标记逻辑");
console.log("    同时标记了峰值(cyclePos<0.5)和谷值(|cyclePos-T|<0.5)");
console.log("    谷值不是补货时点，标记有误");
console.log("    严重程度: MINOR");

console.log("\n  [BUG-3] 非整数周期T下的峰值标记丢失");
console.log("    T=103.24天, 第二周期从day=103.24开始");
console.log("    day=104时cyclePos=0.76>0.5, 不标记峰值");
console.log("    严重程度: MINOR");

console.log("\n  [OK] 折扣曲线区间边界不连续 - 全量折扣模型中TC有跳跃, 正确");
console.log("  [OK] 0%偏离行用round(eoq) - 差异极小, 可接受");
console.log("  [OK] 经典EOQ计算 - 完全正确");
console.log("  [OK] 折扣EOQ可行性判断 - 逻辑正确");
console.log("  [OK] 敏感性分析计算 - 与理论值一致");

console.log("\n===== 测试结果: " + passed + "通过, " + failed + "失败 =====");
