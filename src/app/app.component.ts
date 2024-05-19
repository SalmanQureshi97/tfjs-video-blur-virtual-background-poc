import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('videoC') videoC!: ElementRef; // Reference to the video element
  @ViewChild('canvas') canvas!: ElementRef; // Reference to the canvas element
  private segmenter: any; // Define segmenter as a class variable for body segmentation
  public blurAmount: number = 0; // Control the amount of blur
  private isBlurMode: boolean = true; // Toggle between blur mode and background image mode

  /**
   * AfterViewInit lifecycle hook to start the camera after the view has been initialized.
   */
  ngAfterViewInit(): void {
    this.startCamera();
  }

  /**
   * Initialize the body segmenter using TensorFlow.js.
   */
  async initSegmenter() {
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
    const segmenterConfig: any = {
      runtime: 'mediapipe',
      solutionPath:
        'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
      modelType: 'general',
    };

    this.segmenter = await bodySegmentation.createSegmenter(
      model,
      segmenterConfig
    );

    if (this.isBlurMode) {
      this.canvas.nativeElement.setAttribute('style', `background-image: none`);
      this.blurBackground();
    } else {
      this.removeBackground();
    }
  }

  /**
   * Apply background blur to the video stream.
   */
  async blurBackground() {
    const foregroundThreshold = 0.5;
    const edgeBlurAmount = 3;
    const flipHorizontal = false;
    const context = this.canvas.nativeElement.getContext('2d');

    // Continuously process video frames
    const processFrame = async () => {
      // Draw the video frame on the canvas
      context.drawImage(this.videoC.nativeElement, 0, 0, 640, 480);

      // Apply the background blur effect
      await bodySegmentation.drawBokehEffect(
        this.canvas.nativeElement,
        this.videoC.nativeElement,
        await this.segmenter.segmentPeople(this.videoC.nativeElement),
        foregroundThreshold,
        this.blurAmount,
        edgeBlurAmount,
        flipHorizontal
      );

      // Request the next frame
      requestAnimationFrame(processFrame);
    };

    // Start processing the first frame
    requestAnimationFrame(processFrame);
  }

  /**
   * Remove the background and replace it with a transparent background.
   */
  async removeBackground() {
    this.canvas.nativeElement.width = 640;
    this.canvas.nativeElement.height = 480;
    const context = this.canvas.nativeElement.getContext('2d');

    // Continuously process video frames
    const processFrame = async () => {
      // Draw the video frame on the canvas
      context.drawImage(this.videoC.nativeElement, 0, 0);

      const segmentation = await this.segmenter.segmentPeople(
        this.videoC.nativeElement
      );
      const foregroundColor = { r: 0, g: 0, b: 0, a: 12 };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 15 };

      const coloredPartImage = await bodySegmentation.toBinaryMask(
        segmentation,
        foregroundColor,
        backgroundColor
      );

      // Get the image data of the canvas
      const imageData = context.getImageData(0, 0, 640, 480);
      const pixels = imageData.data;

      // Loop through each pixel to set transparency
      for (let i = 3; i < pixels.length; i += 4) {
        if (coloredPartImage.data[i] === 15) {
          pixels[i] = 0; // Set the alpha channel to 0 (transparent)
        }
      }

      await bodySegmentation.drawBokehEffect(
        this.canvas.nativeElement,
        imageData,
        segmentation,
        0.5,
        10
      );

      // Request the next frame
      requestAnimationFrame(processFrame);
    };

    // Start processing the first frame
    requestAnimationFrame(processFrame);
  }

  /**
   * Start the camera and stream video to the video element.
   */
  async startCamera() {
    await navigator.mediaDevices
      .getUserMedia({
        video: {
          frameRate: 60,
          width: 640,
          height: 480,
        },
        audio: false,
      })
      .then((stream) => {
        this.videoC.nativeElement.srcObject = stream;
        this.videoC.nativeElement.play();
        this.initSegmenter();
      })
      .catch((err) => {
        console.error(`An error occurred: ${err}`);
      });
  }

  /**
   * Set the blur amount to 0 (no blur).
   */
  public noBlur(): void {
    if (!this.isBlurMode) {
      this.isBlurMode = true;
      this.initSegmenter();
    }
    this.blurAmount = 0;
  }

  /**
   * Set the blur amount to a low value.
   */
  public lowBlur(): void {
    if (!this.isBlurMode) {
      this.isBlurMode = true;
      this.initSegmenter();
    }
    this.blurAmount = 3;
  }

  /**
   * Set the blur amount to a medium value.
   */
  public medBlur(): void {
    if (!this.isBlurMode) {
      this.isBlurMode = true;
      this.initSegmenter();
    }
    this.blurAmount = 5;
  }

  /**
   * Set the blur amount to a high value.
   */
  public highBlur(): void {
    if (!this.isBlurMode) {
      this.isBlurMode = true;
      this.initSegmenter();
    }
    this.blurAmount = 10;
  }

  /**
   * Set the background image based on the given ID.
   * @param id - The ID of the background image to set.
   */
  setBackground(id: number) {
    if (this.isBlurMode) {
      this.isBlurMode = false;
      this.initSegmenter();
    }
    this.canvas.nativeElement.setAttribute(
      'style',
      `background-image: url('../assets/bg${id}.jpg')`
    );
  }
}
