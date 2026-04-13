
  function calc(){
    const o2s = Number(o2start.value)/100;
    const o2t = Number(o2target.value)/100;
    const p  = Number(pfinal.value);

    const airFraction = o2t / 0.21;
    const airBar = airFraction * p;
    const heBar  = p - airBar;

    out.textContent = `Target O₂: ${(o2t*100).toFixed(1)}%
`+
                      `Air fraction needed: ${(airFraction*100).toFixed(1)}%
`+
                      `Add air: ${airBar.toFixed(0)} bar
`+
                      `Balance helium: ${heBar.toFixed(0)} bar`;
  }
