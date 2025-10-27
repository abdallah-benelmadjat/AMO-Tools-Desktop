import { Component, ElementRef, inject, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { PrintOptionsMenuService } from '../../../shared/print-options-menu/print-options-menu.service';
import { WaterReportService } from '../water-report.service';
import { SystemTrueCostData } from '../../water-assessment-results.service';
import { WaterAssessmentService } from '../../water-assessment.service';
import { current } from '../../../shared/convert-units/definitions/current';

@Component({
  selector: 'app-true-cost-pie',
  standalone: false,
  templateUrl: './true-cost-pie.component.html',
  styleUrls: ['./true-cost-pie.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrueCostPieComponent {
  private readonly waterReportService = inject(WaterReportService)
  private readonly waterAssessmentService = inject(WaterAssessmentService)
  private readonly printOptionsMenuService = inject(PrintOptionsMenuService)
  private readonly plotlyService = inject(PlotlyService)

  printView: boolean;
  @ViewChild('trueCostPieChart', { static: false }) trueCostPieChart: ElementRef;

  systemTrueCostReportSubscription: Subscription;
  showPrintViewSub: Subscription;

  ngOnInit(): void {
    this.showPrintViewSub = this.printOptionsMenuService.showPrintView.subscribe(val => {
      this.printView = val;
    });
  }

  ngOnDestroy() {
    this.systemTrueCostReportSubscription?.unsubscribe();
    this.showPrintViewSub?.unsubscribe();
  }

  ngAfterViewInit() {
    this.systemTrueCostReportSubscription = this.waterReportService.plantSummaryReport.subscribe(report => {
      if (report && report.allSystemResults && report.trueCostPerYear) {
        const systemLabels = report.allSystemResults.map((system: any) => system.name || 'System');
        const trueCostsRaw = report.allSystemResults.map((system: any) => system.trueCostPerYear);
        const percentCosts = trueCostsRaw.map(val => {
        const rawValue = (val / report.trueCostPerYear * 100);
          return rawValue.toFixed(1);
        });

        const currencyFormatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });
        const trueCostsFormatted = trueCostsRaw.map(val => currencyFormatter.format(val));
        const hoverTemplates = trueCostsFormatted.map((val, idx) =>  `${systemLabels[idx]}: ${val} (${percentCosts[idx]}%)<extra></extra>`);

        const chartData = [{
          type: 'pie',
          labels: systemLabels,
          values: percentCosts,
          text: percentCosts.map(p => `${p}%`),
          textinfo: 'label+percent',
          hoverinfo: 'text',
          hovertemplate: hoverTemplates,
          marker: {
            line: { color: 'white', width: 1 }
          },
          automargin: true
        }];
        const layout = {
          title: 'True Cost of Water Systems',
          height: 500,
          width: this.printView ? 800 : undefined,
          autosize: true,
          margin: { l: 40, r: 40, t: 80, b: 40 },
          legend: {
            orientation: 'v',
            x: 1.02,
            y: 1,
            xanchor: 'left',
            yanchor: 'top'
          },
          // todo colors should at least be aligned with the other pie
        //   colorWay: 
        };
        const configOptions = {
          modeBarButtonsToRemove: [
            'toggleHover', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d',
            'zoom2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines',
            'hoverClosestCartesian', 'hoverCompareCartesian'
          ],
          displaylogo: false,
          displayModeBar: true,
          responsive: this.printView ? false : true
        };
        this.plotlyService.newPlot(this.trueCostPieChart.nativeElement, chartData, layout, configOptions);
      }
    });
  }
}
