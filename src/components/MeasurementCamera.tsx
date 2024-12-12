import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs';
import { Ruler, ArrowUpDown, ArrowLeftRight } from 'lucide-react';

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

interface Measurements {
  height: number;
  shoulderWidth: number;
}

export default function MeasurementCamera() {
  const webcamRef = useRef<Webcam>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [measurements, setMeasurements] = useState<Measurements | null>(null);

  useEffect(() => {
    const initializeDetector = async () => {
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };
      const detector = await poseDetection.createDetector(model, detectorConfig);
      setDetector(detector);
    };

    initializeDetector();
  }, []);

  const calculateMeasurements = (poses: poseDetection.Pose[]) => {
    if (poses.length === 0) return null;

    const pose = poses[0];
    const keypoints = pose.keypoints;

    // Get relevant keypoints
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
    const nose = keypoints.find(kp => kp.name === 'nose');

    if (!leftShoulder || !rightShoulder || !leftAnkle || !nose) return null;

    // Calculate shoulder width (in pixels)
    const shoulderWidth = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) +
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );

    // Calculate height (in pixels)
    const height = Math.abs(nose.y - leftAnkle.y);

    // Convert to approximate centimeters (this is a rough estimation)
    const PIXEL_TO_CM_RATIO = 0.264583; // This is an approximation
    return {
      height: Math.round(height * PIXEL_TO_CM_RATIO),
      shoulderWidth: Math.round(shoulderWidth * PIXEL_TO_CM_RATIO),
    };
  };

  const detect = async () => {
    if (!detector || !webcamRef.current) return;

    const video = webcamRef.current.video;
    if (!video) return;

    const poses = await detector.estimatePoses(video);
    const measurements = calculateMeasurements(poses);
    if (measurements) {
      setMeasurements(measurements);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      detect();
    }, 100);

    return () => clearInterval(interval);
  }, [detector]);

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <Webcam
          ref={webcamRef}
          width={CAMERA_WIDTH}
          height={CAMERA_HEIGHT}
          className="rounded-lg shadow-lg"
        />
        <div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Ruler className="mr-2" />
            Measurements
          </h3>
          {measurements ? (
            <div className="space-y-2">
              <p className="flex items-center">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Height: {measurements.height} cm
              </p>
              <p className="flex items-center">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Shoulder Width: {measurements.shoulderWidth} cm
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Stand in front of the camera...</p>
          )}
        </div>
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <ul className="text-left space-y-2 text-gray-700">
          <li>• Stand about 2-3 meters from the camera</li>
          <li>• Ensure your whole body is visible</li>
          <li>• Stand straight with arms slightly away from body</li>
          <li>• Stay still for accurate measurements</li>
        </ul>
      </div>
    </div>
  );
}