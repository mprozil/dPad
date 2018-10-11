# D-Pad

Simple Power BI visual that works like a directional pad.

Tip: Generate the vertical and horizontal columns with thr DAX below:

    D-Pad Table =
        VAR size = 50 
        VAR H = SELECTCOLUMNS(GENERATESERIES(1;size);"Horizontal";[Value]) 
        VAR V = SELECTCOLUMNS(GENERATESERIES(1;size);"Vertical";[Value]) 
        RETURN 
        GENERATE(H;V)
