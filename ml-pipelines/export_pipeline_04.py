"""Export intervention effectiveness model (pkl) to ONNX."""
import pickle
import numpy as np
from sklearn.impute import SimpleImputer
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType

with open("models/intervention_effectiveness_model.pkl", "rb") as f:
    bundle = pickle.load(f)

model = bundle["model"]
features = bundle["features"]
threshold = bundle.get("threshold", 0.45)

print("Threshold:", threshold)
print("Features:", features)

ct = model.named_steps["preprocessor"]
num_cols = list(ct.transformers_[0][2])
cat_cols = list(ct.transformers_[1][2])
print("Numeric cols:", num_cols)
print("Categorical cols:", cat_cols)

cat_pipe = ct.transformers_[1][1]
print("Cat pipeline steps:", list(cat_pipe.named_steps.keys()))

imputer_step_name = cat_pipe.steps[0][0]
new_imputer = SimpleImputer(strategy="constant", fill_value="missing", missing_values="")
new_imputer.statistics_ = np.array(["missing"] * len(cat_cols))
new_imputer.n_features_in_ = len(cat_cols)
new_imputer.indicator_ = None
cat_pipe.steps[0] = (imputer_step_name, new_imputer)

initial_types = []
for f in features:
    if f in cat_cols:
        initial_types.append((f, StringTensorType([None, 1])))
    else:
        initial_types.append((f, FloatTensorType([None, 1])))

onnx_model = convert_sklearn(
    model,
    initial_types=initial_types,
    options={id(model.named_steps["model"]): {"zipmap": False}},
    target_opset=17,
)

with open("models/intervention_effectiveness_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("Exported to models/intervention_effectiveness_model.onnx")

import onnxruntime as ort
sess = ort.InferenceSession("models/intervention_effectiveness_model.onnx")
print("ONNX outputs:", [o.name for o in sess.get_outputs()])
print("ONNX inputs:", [i.name for i in sess.get_inputs()])
print("Threshold for C#:", threshold)
