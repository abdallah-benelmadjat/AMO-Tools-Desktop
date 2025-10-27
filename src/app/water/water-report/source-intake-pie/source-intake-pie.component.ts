import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { PrintOptionsMenuService } from '../../../shared/print-options-menu/print-options-menu.service';
import { WaterReportService } from '../water-report.service';
import { SystemAnnualSummaryResults } from 'process-flow-lib';
import { WaterAssessmentService } from '../../water-assessment.service';

@Component({
  selector: 'app-system-summary-pie',
  standalone: false,
  templateUrl: './source-intake-pie.component.html',
  styleUrls: ['./source-intake-pie.component.css'],
})
export class SourceIntakePieComponent {
  private readonly waterReportService = inject(WaterReportService)
  private readonly waterAssessmentService = inject(WaterAssessmentService)
  private readonly printOptionsMenuService = inject(PrintOptionsMenuService)
  private readonly plotlyService = inject(PlotlyService)

  printView: boolean;
  @ViewChild('sourceIntakePieChart', { static: false }) sourceIntakePieChart: ElementRef;

  plantSummaryReport: Subscription;
  showPrintViewSub: Subscription;

  ngOnInit(): void {
      this.showPrintViewSub = this.printOptionsMenuService.showPrintView.subscribe(val => {
      this.printView = val;
    });
  }

  ngOnDestroy() {
      this.plantSummaryReport.unsubscribe();
      this.showPrintViewSub.unsubscribe();
  }

  ngAfterViewInit() {
    // todo needs print logic, programmatic colors
    this.plantSummaryReport = this.waterReportService.plantSummaryReport.subscribe(report => {
      if (report) {
        const settings = this.waterAssessmentService.settings.getValue();
        const units = settings && settings.unitsOfMeasure === 'Imperial' ? 'Mgal' : 'm<sup>3</sup>';
        const decimalPrecision = settings.flowDecimalPrecision ?? 2;

        const labels = report.allSystemResults.map((system: SystemAnnualSummaryResults) => system.name || 'System');
        const intakeValuesRaw = report.allSystemResults.map((system: SystemAnnualSummaryResults) => system.sourceWaterIntake || 0);
        const percentIntakes = intakeValuesRaw.map(val => {
          const rawValue = (val / report.sourceWaterIntake * 100);
          return rawValue.toFixed(1);
        });

        const intakeValuesFormatted = intakeValuesRaw.map(val => Number.isInteger(val) ? val : Number(val).toFixed(decimalPrecision));
        const hoverTemplates = intakeValuesFormatted.map((val, idx) => {
          return `${labels[idx]}: ${val} ${units} (${percentIntakes[idx]}%)<extra></extra>`;
        });

        const chartData = [{
          type: 'pie',
          labels: labels,
          values: intakeValuesFormatted,
          text: percentIntakes,
          textinfo: 'label+percent',
          hoverinfo: 'text',
          hovertemplate: hoverTemplates,
          marker: {
            line: { color: 'white', width: 1 }
          },
          automargin: true
        }];

        const layout = {
          title: 'Source Water Intake',
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
          }
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

        this.plotlyService.newPlot(this.sourceIntakePieChart.nativeElement, chartData, layout, configOptions);
      }
    });
  }


}
