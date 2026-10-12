import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Upload, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { employeesApi, getMediaUrl } from "@/api";

interface EmployeePhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onSuccess?: () => void;
}

export function EmployeePhotoModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeePhotoModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "camera">("camera");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize modal state
  useEffect(() => {
    if (open && employee) {
      setSelectedFile(null);
      setCapturedBlob(null);
      const existingPhoto = employee.photoUrl || employee.photo_url || employee.photo;
      setPreviewUrl(existingPhoto ? getMediaUrl(existingPhoto) : null);
    } else {
      stopCamera();
    }
  }, [open, employee]);

  // Handle camera start/stop
  useEffect(() => {
    if (open && activeTab === "camera" && !capturedBlob) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, activeTab, capturedBlob]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      toast.error("Camera access denied or unavailable. You can upload an image file instead.");
      setActiveTab("file");
    } finally {
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
          toast.success("Photo captured! Review and save.");
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retakeSnapshot = () => {
    setCapturedBlob(null);
    setPreviewUrl(null);
    startCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, PNG).");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCapturedBlob(null);
    }
  };

  const handleSave = async () => {
    if (!employee?.id) return;
    const uploadPayload = selectedFile || capturedBlob;
    if (!uploadPayload) {
      toast.error("Please select or capture a photo first.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await employeesApi.uploadPhoto(employee.id, uploadPayload);
      
      const enrolled = response?.biometricEnrolled ?? response?.biometric_enrolled;
      if (enrolled) {
        toast.success("Profile photo & facial biometric vectors enrolled successfully!");
      } else {
        toast.success("Profile photo updated successfully!");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile photo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Update Profile Photo & Biometrics
          </DialogTitle>
          <div className="text-xs text-muted-foreground">
            {employee?.firstName || employee?.first_name} {employee?.lastName || employee?.last_name} ({employee?.code})
            {employee?.siteName || employee?.site_name ? (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {employee.siteName || employee.site_name}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex border-b text-sm font-medium mt-1">
          <button
            type="button"
            className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "camera"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setActiveTab("camera");
              setSelectedFile(null);
            }}
          >
            <Camera className="h-4 w-4" />
            Live Camera Capture
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "file"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setActiveTab("file");
              setCapturedBlob(null);
            }}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>

        {/* Camera Tab Content */}
        {activeTab === "camera" && (
          <div className="space-y-3 pt-3">
            {!capturedBlob ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Face Guide Oval */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-60 border-2 border-primary/80 border-dashed rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse" />
                </div>
                <div className="absolute bottom-2 text-center text-[11px] text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  Center face inside the oval
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Captured Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3" /> Captured
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2">
              {!capturedBlob ? (
                <Button
                  type="button"
                  onClick={captureSnapshot}
                  className="w-full gap-2"
                  disabled={isCapturing}
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakeSnapshot}
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retake Photo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* File Upload Tab Content */}
        {activeTab === "file" && (
          <div className="space-y-3 pt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border">
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors bg-muted/20"
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to select photo</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or JPEG up to 5MB</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-muted/40 p-2.5 rounded-lg border text-[11px] text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            This photo will be isolated to this site and automatically indexed for instant recognition at the tablet attendance kiosk.
          </span>
        </div>

        <DialogFooter className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || (!selectedFile && !capturedBlob)}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving & Syncing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save & Enroll
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
