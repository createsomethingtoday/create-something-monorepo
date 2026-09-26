// Assessment of owned-fixture observations only; never a creator publication authority.
export function assessIsolation(run, controlRun) {
  const fail = reason => ({ passed:false, reason, productionReady:false });
  try {
    if(run?.status!=='cleaned'||run.execution?.exitCode!==0||run.stoppedState?.status!=='stopped')return fail('Execution or cleanup unverified');
    if(controlRun?.execution?.exitCode!==0)return fail('Positive control unavailable');
    const control=JSON.parse(controlRun.execution.output), result=JSON.parse(run.execution.output);
    const value=(r,name)=>r.probes.find(p=>p.name===name)?.result;
    const canary=JSON.parse(value(control,'owned-canary'));
    const checks={
      positiveControl:canary.status===200&&canary.body==='private-owned-canary-v1'&&value(control,'public-tcp')==='connected',
      nonRoot:result.uid===65534,
      directNetworkDenied:value(result,'public-tcp')==='ENETUNREACH',
      localManagementDenied:value(result,'local-management')==='ENETUNREACH'&&value(result,'local-root-execution')==='ENETUNREACH',
      rootReadOnly:result.rootWriteError==='EROFS',
      sharedMemoryUnavailable:['EROFS','ENOENT'].includes(result.sharedMemoryWriteError),
      scratchBounded:result.scratchError==='ENOSPC',
      processesBounded:result.processBound?.attempted===40&&result.processBound.started>0&&result.processBound.started<32&&result.processBound.errors.includes('EAGAIN'),
      privilegesDropped:result.securityStatus?.some(l=>/^CapBnd:\s+0+$/.test(l))&&result.securityStatus?.some(l=>/^NoNewPrivs:\s+1$/.test(l)),
      namespaceEscapeDenied:result.unprivilegedNetworkNamespace?.status===1&&result.unprivilegedNetworkNamespace.stderr.includes('Operation not permitted'),
    };
    return {passed:Object.values(checks).every(v=>v===true),checks,productionReady:false};
  }catch{return fail('Missing or malformed observations');}
}

export function assessMemory(run, recovery, control, providerLimits) {
  const output=run?.execution?.output??'';
  const checks={
    vmMemoryDeclared:providerLimits?.memoryMiB===256,
    killed:run?.execution?.exitCode===137,
    kernelOomEvidence:/Out of memory: Killed process \d+ \(node\)/.test(output),
    stopped:run?.status==='cleaned'&&run.stoppedState?.status==='stopped',
    recovery:assessIsolation(recovery,control).passed,
  };
  return {passed:Object.values(checks).every(v=>v===true),checks,productionReady:false};
}

export function assessOutput(run, recovery, control) {
  const checks = {
    terminatedForOutput: run?.execution?.exitCode === 125 && run.execution.supervision?.reason === 'output-limit',
    thresholdObserved: run?.execution?.supervision?.bytes > 65536,
    retainedOutputBounded: typeof run?.execution?.output === 'string' && typeof run?.execution?.stderr === 'string'
      && new TextEncoder().encode(run.execution.output).length <= 8192
      && new TextEncoder().encode(run.execution.stderr).length <= 1024,
    stopped: run?.status === 'cleaned' && run.stoppedState?.status === 'stopped',
    recovery: assessIsolation(recovery, control).passed,
  };
  return { passed: Object.values(checks).every(v => v === true), checks, productionReady: false };
}
